"""
src/retriever.py
────────────────
Loads the FAISS index and metadata, encodes a query,
and retrieves the top-k most relevant case chunks.
Optionally enriches results with PDF summaries.

Usage (programmatic):
    from src.retriever import Retriever
    r = Retriever()
    results = r.search_cases("telecom spectrum dispute", k=5)
"""

import json
import logging
import re
from pathlib import Path
from typing import Optional

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

log = logging.getLogger(__name__)

INDEX_DIR      = Path("vector_db")
SUMMARIES_PATH = Path("data/processed/pdf_summaries.jsonl")
MODEL_NAME     = "sentence-transformers/all-MiniLM-L6-v2"

# ── Regex to strip redundant metadata prefix from chunk text ───────────────
_META_PREFIX_RE = re.compile(
    r"^Case:\s*.*?\s*\|\s*Petitioner:.*?\s*\|\s*Respondent:.*?\s*\|\s*Judge:.*?\s*\|\s*Bench:.*?\s*\|",
    re.IGNORECASE | re.DOTALL,
)


def _load_jsonl(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def _clean_field(value: object) -> str | None:
    """Normalise a metadata field: return None for missing/nan/empty values."""
    if value is None:
        return None
    s = str(value).strip()
    if s.lower() in ("nan", "none", "n/a", "na", "null", ""):
        return None
    return s


def _clean_text(text: str) -> str:
    """Strip the redundant metadata prefix that is baked into chunk text."""
    cleaned = _META_PREFIX_RE.sub("", text).strip()
    # Also strip any leading pipe/dash artifacts
    cleaned = re.sub(r"^\s*[\|─\-]+\s*", "", cleaned).strip()
    return cleaned if cleaned else text


def _handle_in_re(meta: dict) -> dict:
    """Fix petitioner/respondent for 'IN RE' (suo moto) cases."""
    pet = str(meta.get("petitioner") or "")
    res = str(meta.get("respondent") or "")
    text = str(meta.get("text") or "")

    # Check petitioner, respondent, or early text for IN RE pattern
    combined = f"{pet} {res} {text[:200]}".upper()
    if "IN RE" in combined or "SUO MOTU" in combined or "SUO MOTO" in combined:
        # If petitioner looks like "IN RE: XYZ", extract XYZ to respondent
        in_re_match = re.match(r"IN\s+RE\s*[:\-]?\s*(.*)", pet, re.IGNORECASE)
        if in_re_match:
            subject = in_re_match.group(1).strip()
            meta["petitioner"] = "Court / Suo Motu"
            meta["respondent"] = subject if subject else (res or "Not Available")
        elif pet.strip().upper() in ("IN RE", "IN RE:"):
            meta["petitioner"] = "Court / Suo Motu"
            if not res or res.lower() in ("nan", "none", ""):
                meta["respondent"] = "Not Available"
    return meta


def _normalise_meta(meta: dict) -> dict:
    """Clean and normalise all metadata fields on a result dict."""
    # Clean core fields
    for key in ("petitioner", "respondent", "judge", "case_no", "decision_date"):
        meta[key] = _clean_field(meta.get(key))

    # Handle IN RE / suo motu cases
    meta = _handle_in_re(meta)

    # Clean the chunk text (strip redundant metadata prefix)
    if "text" in meta:
        meta["text"] = _clean_text(meta["text"])

    # Clean judge field — strip "HON'BLE MR. JUSTICE" prefix for conciseness
    if meta.get("judge"):
        judge = meta["judge"]
        judge = re.sub(r"HON'?BLE\s+", "", judge, flags=re.IGNORECASE)
        judge = re.sub(r"MR\.?\s+JUSTICE\s+", "", judge, flags=re.IGNORECASE)
        judge = re.sub(r"MRS?\.?\s+JUSTICE\s+", "", judge, flags=re.IGNORECASE)
        judge = re.sub(r"JUSTICE\s+", "", judge, flags=re.IGNORECASE)
        meta["judge"] = judge.strip() or None

    return meta


class Retriever:
    """FAISS-backed semantic retriever for legal cases."""

    def __init__(
        self,
        index_dir: str = str(INDEX_DIR),
        summaries_path: str = str(SUMMARIES_PATH),
        model_name: str = MODEL_NAME,
    ) -> None:
        idx_dir = Path(index_dir)
        log.info(f"Loading FAISS index from {idx_dir} …")
        self.index    = faiss.read_index(str(idx_dir / "index.faiss"))
        
        # Prefer chunks.jsonl as it contains the 'text' field
        chunks_path = Path("data/processed/chunks.jsonl")
        if chunks_path.exists():
            log.info(f"Loading metadata from {chunks_path} …")
            self.metadata = _load_jsonl(chunks_path)
        else:
            log.warning(f"chunks.jsonl not found, falling back to {idx_dir / 'metadata.jsonl'}")
            self.metadata = _load_jsonl(idx_dir / "metadata.jsonl")

        log.info(f"Index: {self.index.ntotal:,} vectors | Metadata: {len(self.metadata):,} entries")

        log.info(f"Loading embedding model: {model_name}")
        self.model = SentenceTransformer(model_name)

        # Load PDF summaries (optional)
        self.summaries: dict[str, str] = {}
        sp = Path(summaries_path)
        if sp.exists():
            for row in _load_jsonl(sp):
                self.summaries[row["case_id"]] = row.get("summary", "")
            log.info(f"Loaded {len(self.summaries):,} PDF summaries")
        else:
            log.warning(f"PDF summaries not found at {summaries_path}. Skipping.")

    def _apply_filters(self, results: list[dict],
                       filters: dict | None) -> list[dict]:
        """Apply post-retrieval filters (year range, judge, etc.)."""
        if not filters:
            return results

        filtered = results

        # Year range filter
        year_min = filters.get("yearMin")
        year_max = filters.get("yearMax")
        if year_min is not None or year_max is not None:
            def year_match(meta: dict) -> bool:
                y = meta.get("year")
                if y is None:
                    return True
                try:
                    y = int(y)
                except (ValueError, TypeError):
                    return True
                if year_min is not None and y < int(year_min):
                    return False
                if year_max is not None and y > int(year_max):
                    return False
                return True
            filtered = [r for r in filtered if year_match(r)]

        # Judge filter
        judge = filters.get("judge", "").strip()
        if judge:
            judge_lower = judge.lower()
            filtered = [
                r for r in filtered
                if judge_lower in str(r.get("judge", "")).lower()
            ]

        # Minimum relevance threshold
        min_score = filters.get("minScore")
        if min_score is not None:
            try:
                threshold = float(min_score)
                filtered = [r for r in filtered if r.get("score", 0) >= threshold]
            except (ValueError, TypeError):
                pass

        return filtered

    def search_cases(self, query: str, k: int = 5,
                     filters: dict | None = None) -> list[dict]:
        """
        Search for the top-k case chunks most relevant to `query`.
        When filters are provided, over-fetches and then filters down.

        Returns a list of result dicts with keys:
            chunk_id, doc_id, case_id, text, score,
            petitioner, respondent, judge, decision_date,
            year, pdf_url, pdf_summary (if available)
        """
        if not query.strip():
            return []

        # Over-fetch when filters are active to compensate for filtering
        fetch_k = k * 3 if filters else k

        q_emb = self.model.encode(
            [query],
            normalize_embeddings=True,
            convert_to_numpy=True,
        ).astype(np.float32)

        scores, indices = self.index.search(q_emb, fetch_k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.metadata):
                continue
            meta = self.metadata[idx].copy()
            meta["score"] = float(score)

            # Attach PDF summary if available
            cid = meta.get("case_id", "")
            meta["pdf_summary"] = self.summaries.get(cid, "")

            # ── Normalise metadata (clean fields, handle IN RE, strip text prefix)
            meta = _normalise_meta(meta)

            results.append(meta)

        # Apply filters and trim to k
        results = self._apply_filters(results, filters)
        return results[:k]

    def keyword_search(self, query: str, k: int = 5,
                       filters: dict | None = None) -> list[dict]:
        """Simple keyword-based search across metadata text fields."""
        if not query.strip():
            return []

        query_lower = query.lower()
        keywords = query_lower.split()
        scored = []

        for i, meta in enumerate(self.metadata):
            text = str(meta.get("text", "")).lower()
            petitioner = str(meta.get("petitioner", "")).lower()
            respondent = str(meta.get("respondent", "")).lower()
            combined = f"{text} {petitioner} {respondent}"

            hits = sum(1 for kw in keywords if kw in combined)
            if hits > 0:
                entry = meta.copy()
                entry["score"] = hits / len(keywords)
                cid = entry.get("case_id", "")
                entry["pdf_summary"] = self.summaries.get(cid, "")
                entry = _normalise_meta(entry)
                scored.append(entry)

        scored.sort(key=lambda x: x["score"], reverse=True)
        scored = self._apply_filters(scored, filters)
        return scored[:k]

    def hybrid_search(self, query: str, k: int = 5,
                      filters: dict | None = None) -> list[dict]:
        """Combine semantic and keyword search with reciprocal rank fusion."""
        semantic = self.search_cases(query, k=k*2, filters=filters)
        keyword = self.keyword_search(query, k=k*2, filters=filters)

        rrf_scores: dict[str, float] = {}
        rrf_meta: dict[str, dict] = {}

        rrf_k = 60

        for rank, result in enumerate(semantic):
            cid = result.get("case_id", str(rank))
            rrf_scores[cid] = rrf_scores.get(cid, 0) + 1.0 / (rrf_k + rank + 1)
            if cid not in rrf_meta:
                rrf_meta[cid] = result

        for rank, result in enumerate(keyword):
            cid = result.get("case_id", str(rank))
            rrf_scores[cid] = rrf_scores.get(cid, 0) + 1.0 / (rrf_k + rank + 1)
            if cid not in rrf_meta:
                rrf_meta[cid] = result

        ranked = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        results = []
        for cid, score in ranked[:k]:
            entry = rrf_meta[cid].copy()
            entry["score"] = score
            results.append(entry)

        return results
