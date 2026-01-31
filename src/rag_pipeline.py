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
