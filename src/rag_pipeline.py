"""
src/rag_pipeline.py
───────────────────
Retrieves relevant case chunks and generates an LLM answer.
Uses a free HuggingFace model (google/flan-t5-large or similar).

Usage (programmatic):
    from src.rag_pipeline import RAGPipeline
    rag = RAGPipeline()
    result = rag.answer("What are the grounds for quashing an FIR?")
    print(result["answer"])
    print(result["sources"])
"""

import logging
from typing import Any

from src.retriever import Retriever

log = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a legal assistant. "
    "Answer ONLY using the provided context. "
    "Do NOT hallucinate or make up information. "
    "If the answer is not found in the context, respond with exactly: "
    "'Not enough information.'"
)

# ── Free LLM setup ─────────────────────────────────────────────────────────
try:
    from transformers import pipeline as hf_pipeline

    _llm = hf_pipeline(
        "text2text-generation",
        model="google/flan-t5-small",
        max_new_tokens=512,
        do_sample=False,
    )
    log.info("Loaded google/flan-t5-small for generation.")

    # Load a dedicated summarizer (smaller and faster than BART large)
    _summarizer = hf_pipeline(
        "summarization",
        model="sshleifer/distilbart-cnn-12-6",
        max_length=150,
        min_length=30,
        do_sample=False,
    )
    log.info("Loaded sshleifer/distilbart-cnn-12-6 for summarization.")

    def _generate(prompt: str) -> str:
        out = _llm(prompt, max_new_tokens=512)
        return out[0]["generated_text"].strip()

    def _summarize_text(text: str) -> str:
        # Truncate text to fit model context (1024 tokens)
        snippet = text[:3000]
        out = _summarizer(snippet, max_length=150, min_length=30)
        return out[0]["summary_text"].strip()

except Exception as e:
    log.warning(f"HuggingFace LLM unavailable: {e}. Using extractive fallback.")
    _llm = None
    _summarizer = None

    def _generate(prompt: str) -> str:  # type: ignore[misc]
        marker = "Context:\n"
        idx = prompt.find(marker)
        snippet = prompt[idx + len(marker) :] if idx != -1 else prompt
        return snippet[:500].strip() + " [extracted]"

    def _summarize_text(text: str) -> str:
        return text[:300] + "..."


def _build_prompt(query: str, chunks: list[dict]) -> str:
    """Combine retrieved chunks + PDF summaries into a single prompt."""
    context_parts: list[str] = []

    seen_cases: set[str] = set()
    for i, chunk in enumerate(chunks, 1):
        cid = chunk.get("case_id", "")
        text = chunk.get("text", "")
        summary = chunk.get("pdf_summary", "")

        pet = chunk.get("petitioner") or "Unknown"
        res = chunk.get("respondent") or "Unknown"
        judge = chunk.get("judge") or "Unknown"
        date = chunk.get("decision_date") or "Unknown"

        block = f"[Case {i}] Case ID: {cid}\n"
        block += f"Date: {date}\n"
        block += f"Petitioner: {pet}\n"
        block += f"Respondent: {res}\n"
        block += f"Judge: {judge}\n"
        block += f"Excerpt: {text}\n"

        if summary and cid not in seen_cases:
            block += f"PDF Summary: {summary}\n"
            seen_cases.add(cid)

        context_parts.append(block)

    context = "\n---\n".join(context_parts)

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {query}\n\n"
        f"Answer:"
    )
    return prompt


def _format_sources(chunks: list[dict]) -> list[dict]:
    """Return a deduplicated list of source case metadata."""
    seen: set[str] = set()
    sources: list[dict] = []
    for chunk in chunks:
        cid = chunk.get("case_id", "")
        if cid in seen:
            continue
        seen.add(cid)

        pet = chunk.get("petitioner")
        res = chunk.get("respondent")

        # Build a human-readable case title
        if pet and res:
            case_title = f"{pet} v. {res}"
        elif pet:
            case_title = pet
        else:
            case_title = chunk.get("case_no") or cid or "Unknown Case"

        sources.append(
            {
