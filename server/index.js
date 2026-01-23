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
