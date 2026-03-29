"""
src/pdf_processor.py
────────────────────
Downloads up to 1000 valid PDFs from the cleaned dataset,
extracts text, generates summaries using a free HuggingFace LLM,
and saves results to data/processed/pdf_summaries.jsonl.

Usage:
    python src/pdf_processor.py [--limit 1000] [--output data/processed/pdf_summaries.jsonl]
"""

import argparse
import json
import logging
import re
import time
from pathlib import Path

import pandas as pd
import requests

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
log = logging.getLogger(__name__)

# ── Try imports (graceful fallback) ────────────────────────────────────────
try:
    import fitz  # PyMuPDF
    PDF_ENGINE = "pymupdf"
except ImportError:
    try:
        import pdfplumber
        PDF_ENGINE = "pdfplumber"
    except ImportError:
        PDF_ENGINE = None
        log.warning("No PDF engine found. Install pymupdf or pdfplumber.")

try:
    from transformers import pipeline as hf_pipeline
    SUMMARIZER = hf_pipeline(
        "summarization",
        model="facebook/bart-large-cnn",
        max_length=200,
        min_length=60,
        truncation=True,
    )
    log.info("Loaded facebook/bart-large-cnn for summarization.")
except Exception as e:
    SUMMARIZER = None
    log.warning(f"Could not load HuggingFace summarizer: {e}. Summaries will be truncated text.")

# ── Constants ──────────────────────────────────────────────────────────────
TIMEOUT      = 15          # seconds per request
MAX_TEXT_LEN = 3000        # chars fed to summarizer
RETRY_LIMIT  = 2


def clean_text(raw: str) -> str:
    """Remove excess whitespace and non-printable characters."""
    raw = re.sub(r"[^\x20-\x7E\n]", " ", raw)
    raw = re.sub(r"\s+", " ", raw)
    return raw.strip()


def extract_text_pymupdf(pdf_bytes: bytes) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    return clean_text(text)


def extract_text_pdfplumber(pdf_bytes: bytes) -> str:
    import io
    import pdfplumber
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        text = "\n".join(p.extract_text() or "" for p in pdf.pages)
    return clean_text(text)


def extract_text(pdf_bytes: bytes) -> str:
    if PDF_ENGINE == "pymupdf":
        return extract_text_pymupdf(pdf_bytes)
    elif PDF_ENGINE == "pdfplumber":
        return extract_text_pdfplumber(pdf_bytes)
    return ""


def summarize(text: str) -> str:
    """Return a concise legal summary. Falls back to truncation if model unavailable."""
    snippet = text[:MAX_TEXT_LEN]
    if not snippet:
        return ""
    if SUMMARIZER is not None:
        try:
            result = SUMMARIZER(snippet, do_sample=False)
            return result[0]["summary_text"].strip()
        except Exception as e:
            log.debug(f"Summarizer error: {e}")
    # Fallback: first 300 chars
    return snippet[:300] + ("…" if len(snippet) > 300 else "")


def download_pdf(url: str) -> bytes | None:
    """Download PDF bytes from URL. Returns None on failure."""
    for attempt in range(1, RETRY_LIMIT + 1):
        try:
            resp = requests.get(url, timeout=TIMEOUT, stream=True)
            if resp.status_code == 200 and "pdf" in resp.headers.get("Content-Type", "").lower():
                return resp.content
            # Try anyway if content-type header is wrong
            if resp.status_code == 200 and len(resp.content) > 1000:
                return resp.content
            log.debug(f"Bad response {resp.status_code} for {url}")
            return None
        except Exception as e:
            log.debug(f"Attempt {attempt} failed for {url}: {e}")
            time.sleep(1)
    return None


def process(
    clean_csv: str = "data/processed/cases_clean.csv",
    output_path: str = "data/processed/pdf_summaries.jsonl",
    limit: int = 1000,
) -> None:
    out_path = Path(output_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(clean_csv, low_memory=False)
    log.info(f"Loaded {len(df):,} cases from {clean_csv}")

    # Deduplicate by PDF URL
    df = df.dropna(subset=["pdf_path"])
    df = df[df["pdf_path"].str.strip() != ""]
    df = df.drop_duplicates(subset=["pdf_path"])
    log.info(f"{len(df):,} unique PDF URLs to process (limit={limit})")

    processed, skipped = 0, 0

    with open(out_path, "w", encoding="utf-8") as fout:
        for _, row in df.iterrows():
            if processed >= limit:
                break

            case_id = str(row.get("case_id", ""))
            pdf_url = str(row.get("pdf_path", "")).strip()

            log.info(f"[{processed+1}/{limit}] {case_id} → {pdf_url[:80]}")

            pdf_bytes = download_pdf(pdf_url)
            if pdf_bytes is None:
                log.warning(f"  Skipped (download failed): {pdf_url}")
                skipped += 1
                continue

            text = extract_text(pdf_bytes)
            if not text:
                log.warning(f"  Skipped (empty text): {pdf_url}")
                skipped += 1
                continue

            summary = summarize(text)

            record = {
                "case_id" : case_id,
                "pdf_url" : pdf_url,
                "summary" : summary,
            }
            fout.write(json.dumps(record, ensure_ascii=False) + "\n")
            processed += 1

    log.info(f"Done. Processed={processed}, Skipped={skipped}")
    log.info(f"Saved → {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PDF scraping + summarization")
    parser.add_argument("--input",  default="data/processed/cases_clean.csv")
    parser.add_argument("--output", default="data/processed/pdf_summaries.jsonl")
    parser.add_argument("--limit",  type=int, default=1000)
    args = parser.parse_args()

    process(clean_csv=args.input, output_path=args.output, limit=args.limit)
