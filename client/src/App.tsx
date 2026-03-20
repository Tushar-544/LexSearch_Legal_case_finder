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
        <span className="relevance-score">{(src.score * 100).toPrecision(3)}% Match</span>
      </div>

      <div className="card-details-grid">
         <div className="detail-item"><strong>Petitioner:</strong> {src.petitioner || "Unknown"}</div>
         <div className="detail-item"><strong>Respondent:</strong> {src.respondent || "Unknown"}</div>
         <div className="detail-item"><strong>Judge:</strong> {src.judge || "Not specified"}</div>
         <div className="detail-item"><strong>Date:</strong> {src.decision_date || "Unknown"}</div>
      </div>

      <div className="judgment-box">
        <div className={`judgment-text ${!isExpanded ? "clamped" : ""}`}>
           {cleanExcerpt(src.text)}
        </div>
        <div className="box-actions">
           <button className="expand-link-btn" onClick={() => setIsExpanded(!isExpanded)}>
             {isExpanded ? "↑ Show less" : "↓ Read judgment excerpt"}
           </button>
           
           {!summary && !sumLoading && (
             <button className="pill-btn summarizer-trigger" onClick={handleSummarize}>
               ✨ AI Summary
             </button>
           )}
           {sumLoading && <span className="pulsing-text">AI Summarizing...</span>}
        </div>
      </div>

      {summary && (
        <div className="ai-summary-highlight">
          <div className="summary-header">
             <span className="ai-icon">✨</span> AI KEY FINDINGS
          </div>
          <p className="summary-body">{summary}</p>
        </div>
      )}

      <div className="card-footer-buttons">
        {src.pdf_url && (
          <a
            className="footer-btn brand-btn"
            href={src.pdf_url.startsWith("http") ? src.pdf_url : `https://main.sci.gov.in/${src.pdf_url}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            📂 Official PDF
          </a>
        )}

        <a
          className="footer-btn alt-btn"
          href={getKanoonLink(src)}
          target="_blank"
          rel="noopener noreferrer"
        >
          🔍 Search Alternative
        </a>
      </div>
    </div>
  );
}

// ── Main App Component ───────────────────────────────────────────────────────
export default function App() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [allSources, setAllSources] = useState<Source[]>([]);

  // Bookmarks
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState<Source[]>(loadBookmarks);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Comparison
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonCases, setComparisonCases] = useState<Source[]>([]);

  // Timeline
  const [showTimeline, setShowTimeline] = useState(false);

  // Search Mode
  const [searchMode, setSearchMode] = useState<SearchMode>("semantic");

  // Sync bookmarks to localStorage
  useEffect(() => {
    saveBookmarks(bookmarks);
  }, [bookmarks]);

  const toggleBookmark = useCallback(
    (src: Source) => {
      setBookmarks((prev) => {
        const exists = prev.some((b) => b.case_id === src.case_id);
        if (exists) return prev.filter((b) => b.case_id !== src.case_id);
        return [...prev, src];
      });
    },
    []
  );

  // Handle summarize requests from chat
  const handleSummarize = useCallback(async (text: string): Promise<string> => {
    try {
      const resp = await fetch(`${API_BASE}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await resp.json();
      return data.summary || "Failed to generate summary.";
    } catch {
      return "Error connecting to summarizer.";
    }
  }, []);

  // Build filter object for API (only non-empty values)
  const getApiFilters = useCallback(() => {
    const f: Record<string, string> = {};
    if (filters.yearMin) f.yearMin = filters.yearMin;
    if (filters.yearMax) f.yearMax = filters.yearMax;
    if (filters.judge.trim()) f.judge = filters.judge.trim();
    if (filters.minScore) f.minScore = filters.minScore;
    return Object.keys(f).length > 0 ? f : null;
  }, [filters]);

  // Main search handler — adds messages to chat
  const handleSearch = useCallback(
    async (queryText: string) => {
      const q = queryText.trim();
      if (!q || loading) return;

      setCurrentQuery(q);

      // Add user message
      const userMsg: ChatMsg = {
        id: genId(),
        role: "user",
        content: q,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const body: Record<string, unknown> = { query: q, k: 5 };
        const apiFilters = getApiFilters();
        if (apiFilters) body.filters = apiFilters;
        if (searchMode !== "semantic") body.searchMode = searchMode;

        const resp = await fetch(`${API_BASE}/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!resp.ok) throw new Error(`Server error: ${resp.status}`);

        const data: SearchResult = await resp.json();

        // Track all sources for export/comparison
        if (data.sources) {
          setAllSources((prev) => {
            const existing = new Set(prev.map((s) => s.case_id));
            const newOnes = data.sources.filter((s) => !existing.has(s.case_id));
            return [...prev, ...newOnes];
          });
        }

        const aiMsg: ChatMsg = {
          id: genId(),
          role: "ai",
          content: data.answer,
          sources: data.sources,
          suggestions: data.suggestions,
          key_points: data.key_points,
          summary: data.summary,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err: unknown) {
        const errMsg: ChatMsg = {
          id: genId(),
          role: "ai",
          content: `❌ Error: ${err instanceof Error ? err.message : "Network error. Please check if the backend is running."}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setLoading(false);
      }
    },
    [loading, getApiFilters, searchMode]
  );

  // Voice search callback
  const handleVoiceResult = useCallback(
    (text: string) => {
      handleSearch(text);
    },
    [handleSearch]
  );

  const hasActiveFilters = Object.values(filters).some((v) => v.trim() !== "");

  const suggestionCases = [
    "Grounds for Anticipatory Bail",
    "Section 498A Quashing of FIR",
    "Narcotic Drugs ACT NDPS Search Procedure",
    "Custodial Torture Suo Motu Jurisdiction",
    "Land Acquisition Market Value Compensation",
  ];

  return (
    <div className="lex-explorer-app">
      {/* ── Navbar ── */}
      <nav className="lex-nav">
        <div className="nav-logo">
          <span className="logo-emoji">⚖️</span>
          <div className="logo-group">
            <span className="logo-name">LexSearch</span>
            <span className="logo-tag">Supreme Court Case Intelligence</span>
          </div>
        </div>
        <div className="nav-actions">
          {/* Search Mode Toggle */}
          <div className="search-mode-toggle">
            {(["semantic", "keyword", "hybrid"] as SearchMode[]).map((mode) => (
              <button
                key={mode}
                className={`mode-btn ${searchMode === mode ? "active" : ""}`}
                onClick={() => setSearchMode(mode)}
                title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} search`}
              >
                {mode === "semantic" ? "🧠" : mode === "keyword" ? "🔤" : "🔀"}{" "}
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <button
            className={`nav-action-btn ${hasActiveFilters ? "active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            🔧 Filters {hasActiveFilters ? "●" : ""}
          </button>

          <button
            className={`nav-action-btn ${showBookmarks ? "active" : ""}`}
            onClick={() => setShowBookmarks(!showBookmarks)}
          >
            🔖 Saved ({bookmarks.length})
          </button>

          {allSources.length >= 2 && (
            <button
              className="nav-action-btn"
              onClick={() => {
                setComparisonCases(allSources.slice(0, 4));
                setShowComparison(true);
              }}
            >
              ⚖️ Compare
            </button>
          )}

          {allSources.length > 0 && (
            <button
              className="nav-action-btn"
              onClick={() => setShowTimeline(true)}
            >
              📅 Timeline
            </button>
          )}

          <ExportButton sources={allSources} query={currentQuery} />
          <VoiceSearchButton onResult={handleVoiceResult} />
        </div>
      </nav>

      {/* ── Filters Panel ── */}
      {showFilters && (
        <div className="panel-overlay" onClick={() => setShowFilters(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <FiltersPanel
              filters={filters}
              onChange={setFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>
        </div>
      )}

      {/* ── Bookmarks Sidebar ── */}
      {showBookmarks && (
        <div className="bookmarks-panel">
          <div className="bookmarks-header">
            <h3>🔖 Saved Cases</h3>
            <button
              className="close-panel-btn"
              onClick={() => setShowBookmarks(false)}
            >
              ✕
            </button>
          </div>
          {bookmarks.length === 0 ? (
            <p className="bookmarks-empty">
              No saved cases yet. Click the bookmark icon on any case to save it.
            </p>
          ) : (
            <div className="bookmarks-list">
              {bookmarks.map((bm) => (
                <div key={bm.case_id} className="bookmark-item">
                  <div className="bookmark-info">
                    <strong>{bm.case_no || bm.case_id}</strong>
                    <span>
                      {bm.petitioner} vs {bm.respondent}
                    </span>
                    <span className="bm-date">{bm.decision_date}</span>
                  </div>
                  <button
                    className="bm-remove-btn"
                    onClick={() => toggleBookmark(bm)}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Comparison View ── */}
      {showComparison && (
        <ComparisonView
          cases={comparisonCases}
          onClose={() => setShowComparison(false)}
        />
      )}

      {/* ── Timeline View ── */}
      {showTimeline && (
        <TimelineView
          sources={allSources}
          onClose={() => setShowTimeline(false)}
        />
      )}

      {/* ── Hero Section (shown only when no messages) ── */}
      {messages.length === 0 && (
        <header className="lex-hero">
          <h1 className="hero-heading">
            Find relevant legal precedents <span>instantly.</span>
          </h1>
          <p className="hero-subheading">
            AI-driven semantic search across 47,000+ Supreme Court judgments.
          </p>

          <div className="hero-features">
            <div className="hero-feature-pill">💬 Chat Interface</div>
            <div className="hero-feature-pill">🔧 Smart Filters</div>
            <div className="hero-feature-pill">📌 Key Takeaways</div>
            <div className="hero-feature-pill">🔖 Bookmarks</div>
            <div className="hero-feature-pill">⚖️ Case Compare</div>
            <div className="hero-feature-pill">📅 Timeline</div>
            <div className="hero-feature-pill">🎙️ Voice Search</div>
            <div className="hero-feature-pill">📥 Export</div>
          </div>

          <div className="search-suggestion-bar">
            <span className="sugg-label">Try searching for:</span>
            <div className="sugg-list">
              {suggestionCases.map((caseName) => (
                <button
                  key={caseName}
                  className="sugg-tag"
                  onClick={() => handleSearch(caseName)}
                >
                  {caseName}
                </button>
              ))}
            </div>
          </div>
        </header>
      )}

      {/* ── Chat Window ── */}
      <ChatWindow
        messages={messages}
        loading={loading}
        onSend={handleSearch}
        onSuggestionClick={handleSearch}
        onSummarize={handleSummarize}
        currentQuery={currentQuery}
      />

      {/* ── Footer ── */}
      <footer className="lex-footer-area">
        <p>© 2026 LexSearch AI — Built for the Indian Legal Community</p>
      </footer>
    </div>
  );
}
