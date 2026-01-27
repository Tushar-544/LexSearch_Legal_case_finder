/**
 * server/index.js
 * ─────────────────
 * Express backend — bridges the React frontend with the Python RAG pipeline.
 *
 * POST /api/search
 *   Body : { "query": "...", "k": 5, "filters": {...}, "searchMode": "semantic" }
 *   Reply: { "query": "...", "answer": "...", "sources": [...],
 *            "suggestions": [...], "key_points": [...] }
 *
 * POST /api/summarize
 *   Body : { "text": "..." }
 *   Reply: { "summary": "..." }
 *
 * Start with:
 *   node server/index.js
 */

import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");   // project root

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Main search endpoint ───────────────────────────────────────────────────
app.post("/api/search", (req, res) => {
  const {
    query = "",
    k = 5,
    filters = null,
    searchMode = "semantic",
    history = [],
    rewrite = false,
  } = req.body;

  if (!query.trim()) {
    return res.status(400).json({ error: "Query must not be empty." });
  }

  const args = ["src/run_rag.py", "--query", query, "--k", String(k)];

  // Pass filters as JSON string
  if (filters && typeof filters === "object" && Object.keys(filters).length > 0) {
    args.push("--filters", JSON.stringify(filters));
  }

  // Pass search mode
  if (["semantic", "keyword", "hybrid"].includes(searchMode)) {
    args.push("--search-mode", searchMode);
  }

  // Enable query rewriting
  if (rewrite) {
    args.push("--rewrite");
  }

  const py = spawn("python", args, {
    cwd: ROOT,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });

  let stdout = "";
  let stderr = "";

  py.stdout.on("data", (d) => (stdout += d.toString()));
  py.stderr.on("data", (d) => (stderr += d.toString()));

  py.on("close", (code) => {
    if (code !== 0) {
      console.error("[Python stderr]", stderr);
      return res.status(500).json({
        error: "RAG pipeline failed.",
        detail: stderr.slice(-500),
      });
    }

    try {
      const result = JSON.parse(stdout);
      return res.json(result);
    } catch {
      console.error("[Parse error] stdout:", stdout);
      return res.status(500).json({ error: "Failed to parse Python output." });
    }
  });

  py.on("error", (err) => {
    console.error("[Spawn error]", err);
    res.status(500).json({ error: "Could not start Python process.", detail: err.message });
  });
});

// ── Summarize endpoint ─────────────────────────────────────────────────────
app.post("/api/summarize", (req, res) => {
  const { text = "" } = req.body;

  const py = spawn("python", ["src/run_summarize.py"], {
    cwd: ROOT,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });

  py.stdin.write(text);
  py.stdin.end();

  let stdout = "";
  let stderr = "";

  py.stdout.on("data", (d) => (stdout += d.toString()));
  py.stderr.on("data", (d) => (stderr += d.toString()));

  py.on("close", (code) => {
    if (code !== 0) {
      console.error("[Python stderr]", stderr);
      return res.status(500).json({ error: "Summarization failed." });
    }

    try {
      const result = JSON.parse(stdout);
      return res.json(result);
    } catch {
      return res.status(500).json({ error: "Failed to parse summary output." });
    }
  });

  py.on("error", (err) => {
    res.status(500).json({ error: "Could not start Python process." });
  });
});

app.listen(PORT, () => {
  console.log(`\n✅  Legal Case Finder API running at http://localhost:${PORT}\n`);
});
