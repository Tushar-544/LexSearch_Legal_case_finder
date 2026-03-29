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

        block = f"[Case {i}] Case ID: {cid}\n"
        block += f"Date: {chunk.get('decision_date', 'Unknown')}\n"
        block += f"Petitioner: {chunk.get('petitioner', '')}\n"
        block += f"Respondent: {chunk.get('respondent', '')}\n"
        block += f"Judge: {chunk.get('judge', '')}\n"
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
        sources.append(
            {
                "case_id"      : cid,
                "case_no"      : chunk.get("case_no", ""),
                "petitioner"   : chunk.get("petitioner", ""),
                "respondent"   : chunk.get("respondent", ""),
                "judge"        : chunk.get("judge", ""),
                "decision_date": chunk.get("decision_date", ""),
                "year"         : chunk.get("year"),
                "text"         : chunk.get("text", ""),
                "pdf_url"      : chunk.get("pdf_url", ""),
                "score"        : round(chunk.get("score", 0.0), 4),
            }
        )
    return sources


class RAGPipeline:
    """End-to-end RAG: retrieve → prompt → generate → return."""

    def __init__(self, retriever: Retriever | None = None, k: int = 5) -> None:
        self.retriever = retriever or Retriever()
        self.k = k

    def answer(self, query: str) -> dict[str, Any]:
        """
        Run the full RAG pipeline.

        Returns:
            {
                "query"  : str,
                "answer" : str,
                "sources": list[dict],
            }
        """
        if not query.strip():
            return {"query": query, "answer": "Please enter a valid query.", "sources": []}

        chunks = self.retriever.search_cases(query, k=self.k)
        if not chunks:
            return {
                "query"  : query,
                "answer" : "Not enough information.",
                "sources": [],
            }

        prompt = _build_prompt(query, chunks)
        log.debug(f"Prompt length: {len(prompt)} chars")

        answer = _generate(prompt)
        sources = _format_sources(chunks)

        return {
            "query"  : query,
            "answer" : answer,
            "sources": sources,
        }

    def summarize(self, text: str) -> str:
        """Generate a concise summary of a given piece of text."""
        if not text.strip():
            return ""
        return _summarize_text(text)
