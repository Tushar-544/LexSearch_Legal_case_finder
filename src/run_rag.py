"""
src/run_rag.py
──────────────
CLI entry point for the RAG pipeline.

Usage:
    python src/run_rag.py --query "What are the grounds for quashing an FIR?"

Output (stdout):
    JSON with keys: query, answer, sources
"""

import argparse
import json
import logging
import sys

# Allow running from project root
sys.path.insert(0, ".")

from src.rag_pipeline import RAGPipeline

logging.basicConfig(level=logging.WARNING)  # suppress info logs for clean JSON output


def main() -> None:
    parser = argparse.ArgumentParser(description="Legal Case RAG — CLI runner")
    parser.add_argument(
        "--query", "-q",
        required=True,
        help="Natural language legal query",
    )
    parser.add_argument(
        "--k",
        type=int,
        default=5,
        help="Number of chunks to retrieve (default: 5)",
    )
    args = parser.parse_args()

    rag    = RAGPipeline(k=args.k)
    result = rag.answer(args.query)

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
