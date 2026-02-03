"""
src/run_rag.py
──────────────
CLI entry point for the RAG pipeline.

Usage:
    python src/run_rag.py --query "What are the grounds for quashing an FIR?"
    python src/run_rag.py --query "bail" --filters '{"yearMin":2020,"judge":"Chandrachud"}'

Output (stdout):
    JSON with keys: query, answer, sources, suggestions, key_points
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
    parser.add_argument(
        "--filters",
        type=str,
        default="",
        help="JSON string of filters: {yearMin, yearMax, judge, minScore}",
