/**
 * client/src/App.tsx
 * ──────────────────
 * Legal Case Finder — React UI
 *
 * Features:
 *  - Conversational chat-based interface
 *  - Bookmark system (localStorage)
 *  - Advanced filters (year range, judge, relevance)
 *  - Follow-up suggestions & key takeaways
 *  - Confidence visualization & keyword highlighting
 *  - Case comparison & timeline view
 *  - Explain Like I'm 5 (simplify)
 *  - Voice search & export results
 *  - Search mode toggle (Semantic/Keyword/Hybrid)
 */

import { useState, useCallback, useEffect } from "react";
import ChatWindow from "./components/ChatWindow";
import { ChatMsg, Source } from "./components/ChatMessage";
import FiltersPanel, { Filters, DEFAULT_FILTERS } from "./components/FiltersPanel";
import ComparisonView from "./components/ComparisonView";
import TimelineView from "./components/TimelineView";
import ExportButton from "./components/ExportButton";
import VoiceSearchButton from "./components/VoiceSearchButton";

// ── Types ──────────────────────────────────────────────────────────────────
interface SearchResult {
  query: string;
  answer: string;
  sources: Source[];
  suggestions?: string[];
  key_points?: string[];
  summary?: string;
}

type SearchMode = "semantic" | "keyword" | "hybrid";

// ── Helpers ────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:3001";

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Bookmark helper fns ───────────────────────────────────────────────────
const BM_KEY = "lexsearch_bookmarks";

function loadBookmarks(): Source[] {
  try {
    const raw = localStorage.getItem(BM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bms: Source[]) {
  localStorage.setItem(BM_KEY, JSON.stringify(bms));
}

// ── Sub-components ─────────────────────────────────────────────────────────
function SourceCard({ src, idx }: { src: Source; idx: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [sumLoading, setSumLoading] = useState(false);

  const getKanoonLink = (src: Source) => {
    const q = src.case_no || `${src.petitioner} vs ${src.respondent}`;
    return `https://indiankanoon.org/search/?formInput=${encodeURIComponent(q)}`;
  };

  const handleSummarize = async () => {
    if (summary) return;
    setSumLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: src.text }),
      });
      const data = await resp.json();
      setSummary(data.summary || "Failed to generate summary.");
    } catch {
      setSummary("Error connecting to summarizer.");
    } finally {
      setSumLoading(false);
    }
  };

  const cleanExcerpt = (text: string) => {
    return text.replace(/^Case:\s*.*?\s*\|\s*Petitioner:.*?\s*\|\s*Respondent:.*?\s*\|\s*Judge:.*?\s*\|\s*Bench:.*?\s*\|/i, "").trim();
  };

  return (
    <div className="source-card">
      <div className="card-top-header">
        <span className="source-number">#{idx + 1}</span>
        <div className="case-id-group">
          <span className="case-no-pill">{src.case_no || "N/A"}</span>
          <span className="case-year-label">{src.decision_date?.split("-")?.pop() || "N/A"}</span>
        </div>
