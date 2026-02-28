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
                "case_id"      : cid,
                "case_no"      : chunk.get("case_no"),
                "case_title"   : case_title,
                "petitioner"   : pet,
                "respondent"   : res,
                "judge"        : chunk.get("judge"),
                "decision_date": chunk.get("decision_date"),
                "year"         : chunk.get("year"),
                "text"         : chunk.get("text", ""),
                "pdf_url"      : chunk.get("pdf_url", ""),
                "score"        : round(chunk.get("score", 0.0), 4),
            }
        )
    return sources


# ── Case Summary Generation ───────────────────────────────────────────────
def _generate_case_summary(query: str, sources: list[dict]) -> str:
    """Generate a meaningful 2-4 line summary explaining how the results
    relate to the user's query."""
    if not sources:
        return ""

    # Build a concise context from top sources
    case_titles = []
    for s in sources[:3]:
        title = s.get("case_title", "")
        date = s.get("decision_date", "")
        judge = s.get("judge", "")
        parts = [title]
        if date:
            parts.append(f"decided on {date}")
        if judge:
            parts.append(f"by {judge}")
        case_titles.append(", ".join(parts))

    cases_text = "; ".join(case_titles)
    excerpts = " ".join(s.get("text", "")[:200] for s in sources[:2])

    try:
        prompt = (
            f"Summarize in 2-3 sentences how these legal cases relate to "
            f"the query '{query}'.\n\n"
            f"Cases found: {cases_text}\n"
            f"Key excerpts: {excerpts[:500]}\n\n"
            f"Summary:"
        )
        summary = _generate(prompt)
        if summary and len(summary) > 20:
            return summary
    except Exception as e:
        log.warning(f"Case summary generation failed: {e}")

    # Fallback: template-based summary
    n = len(sources)
    top = sources[0]
    title = top.get("case_title", "a relevant case")
    return (
        f"Found {n} relevant case{'s' if n > 1 else ''} for your query "
        f"'{query}'. The most relevant is {title}. "
        f"These cases address legal issues closely related to your question."
    )


# ── Follow-up suggestions ──────────────────────────────────────────────────
def _generate_followups(query: str, answer: str) -> list[str]:
    """Generate 3 follow-up question suggestions based on the query and answer."""
    try:
        prompt = (
            f"Based on a legal question and its answer, generate exactly 3 "
            f"follow-up questions a lawyer would want to ask next.\n\n"
            f"Original question: {query}\n"
            f"Answer summary: {answer[:500]}\n\n"
            f"List 3 follow-up questions, one per line:"
        )
        raw = _generate(prompt)
        lines = [
            line.strip().lstrip("0123456789.-) ").strip()
            for line in raw.split("\n")
            if line.strip() and len(line.strip()) > 10
        ]
        return lines[:3] if lines else _fallback_followups(query)
    except Exception as e:
        log.warning(f"Follow-up generation failed: {e}")
        return _fallback_followups(query)


def _fallback_followups(query: str) -> list[str]:
    """Generate rule-based follow-up suggestions when LLM fails."""
    return [
        f"What are the landmark cases related to this topic?",
        f"What are the exceptions to this rule?",
        f"How has the Supreme Court's stance evolved on this issue?",
    ]


# ── Key takeaways extraction ──────────────────────────────────────────────
def _extract_key_points(answer: str) -> list[str]:
    """Extract 3-5 key bullet points from the answer."""
    try:
        prompt = (
            f"Extract 3 to 5 key legal takeaways from the following answer "
            f"as short bullet points:\n\n{answer[:1000]}\n\nKey points:"
        )
        raw = _generate(prompt)
        lines = [
            line.strip().lstrip("0123456789.-•) ").strip()
            for line in raw.split("\n")
            if line.strip() and len(line.strip()) > 10
        ]
        return lines[:5] if lines else [answer[:200]]
    except Exception as e:
        log.warning(f"Key points extraction failed: {e}")
        sentences = [s.strip() for s in answer.replace(".", ".\n").split("\n") if s.strip()]
        return sentences[:3] if sentences else [answer[:200]]


# ── Query rewriting ───────────────────────────────────────────────────────
def _rewrite_query(query: str) -> str:
    """Rewrite user query for better retrieval (expand, clarify, legalize)."""
    try:
        prompt = (
            f"Rewrite the following legal query to make it more specific and "
            f"suitable for semantic search across Indian Supreme Court judgments. "
            f"Keep it concise.\n\n"
            f"Original: {query}\nRewritten:"
        )
        rewritten = _generate(prompt).strip()
        if rewritten and len(rewritten) > 10:
            return rewritten
        return query
    except Exception:
        return query


class RAGPipeline:
    """End-to-end RAG: retrieve → prompt → generate → return."""

