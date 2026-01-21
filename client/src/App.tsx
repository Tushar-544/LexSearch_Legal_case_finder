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
