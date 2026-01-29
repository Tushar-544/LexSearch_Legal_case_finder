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


