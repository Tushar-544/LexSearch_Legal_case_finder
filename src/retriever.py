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
from pathlib import Path
from typing import Optional

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

log = logging.getLogger(__name__)

INDEX_DIR      = Path("vector_db")
SUMMARIES_PATH = Path("data/processed/pdf_summaries.jsonl")
MODEL_NAME     = "sentence-transformers/all-MiniLM-L6-v2"


def _load_jsonl(path: Path) -> list[dict]:
    with open(path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


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

    def search_cases(self, query: str, k: int = 5) -> list[dict]:
        """
        Search for the top-k case chunks most relevant to `query`.

        Returns a list of result dicts with keys:
            chunk_id, doc_id, case_id, text, score,
            petitioner, respondent, judge, decision_date,
            year, pdf_url, pdf_summary (if available)
        """
        if not query.strip():
            return []

        q_emb = self.model.encode(
            [query],
            normalize_embeddings=True,
            convert_to_numpy=True,
        ).astype(np.float32)

        scores, indices = self.index.search(q_emb, k)
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.metadata):
                continue
            meta = self.metadata[idx].copy()
            meta["score"] = float(score)
            
            # Clean up 'nan' strings that sometimes appear in data
            for key in ["judge", "petitioner", "respondent"]:
                if str(meta.get(key)).lower() == "nan":
                    meta[key] = "Unknown"

            # Attach PDF summary if available
            cid = meta.get("case_id", "")
            meta["pdf_summary"] = self.summaries.get(cid, "")
            results.append(meta)

        return results
