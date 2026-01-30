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
