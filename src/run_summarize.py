"""
src/run_summarize.py
────────────────────
Single-use CLI for summarization. Reads text from stdin/args and returns JSON.
"""

import argparse
import json
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from src.rag_pipeline import RAGPipeline

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", type=str, default="")
    args = parser.parse_args()

    text = args.text
    if not text:
        # Fallback to stdin
        text = sys.stdin.read()

    rag = RAGPipeline()
    summary = rag.summarize(text)
    
    print(json.dumps({"summary": summary}, ensure_ascii=False))

if __name__ == "__main__":
    main()
