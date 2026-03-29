/**
 * client/src/App.tsx
 * ──────────────────
 * Legal Case Finder — React UI
 *
 * Features:
 *  - Natural-language query input
 *  - Streams results from POST /api/search
 *  - Displays LLM answer + source cases with PDF links
 */

import { useState, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
interface Source {
  case_id: string;
  case_no: string;
  petitioner: string;
  respondent: string;
  judge: string;
  decision_date: string;
  year: number | null;
  text: string; // The case chunk text
  pdf_url: string;
  score: number;
}

interface SearchResult {
  query: string;
  answer: string;
  sources: Source[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
const API_URL = "http://localhost:3001/api/search";

function isValidUrl(str: string): boolean {
  try { new URL(str); return true; }
  catch { return false; }
}

// ── Sub-components ─────────────────────────────────────────────────────────
function SourceCard({ src, idx }: { src: Source; idx: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [sumLoading, setSumLoading] = useState(false);

  // Helper to find a good search string for Indian Kanoon
  const getKanoonLink = (src: Source) => {
    const q = src.case_no || `${src.petitioner} vs ${src.respondent}`;
    return `https://indiankanoon.org/search/?formInput=${encodeURIComponent(q)}`;
  };

  const handleSummarize = async () => {
    if (summary) return;
    setSumLoading(true);
    try {
      const resp = await fetch("http://localhost:3001/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: src.text }),
      });
      const data = await resp.json();
      setSummary(data.summary || "Failed to generate summary.");
    } catch (err) {
      setSummary("Error connecting to summarizer.");
    } finally {
      setSumLoading(false);
    }
  };

  // Improved text cleaning regex to strip leading metadata
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
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(forcedQuery?: string) {
    const q = forcedQuery || query.trim();
    if (!q) return;

    if (forcedQuery) setQuery(forcedQuery);

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const resp = await fetch("http://localhost:3001/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, k: 5 }),
      });

      if (!resp.ok) {
        throw new Error(`Server error: ${resp.status}`);
      }

      const data: SearchResult = await resp.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  const suggestionCases = [
    "Grounds for Anticipatory Bail",
    "Section 498A Quashing of FIR",
    "Narcotic Drugs ACT NDPS Search Procedure",
    "Custodial Torture Suo Motu Jurisdiction",
    "Land Acquisition Market Value Compensation"
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
      </nav>

      {/* ── Hero Search Section ── */}
      <header className="lex-hero">
         <h1 className="hero-heading">Find relevant legal precedents <span>instantly.</span></h1>
         <p className="hero-subheading">AI-driven semantic search across 47,000+ Supreme Court judgments.</p>

         <div className="search-composite-box">
           <div className="search-field">
             <span className="field-icon">🔍</span>
             <input 
               type="text" 
               placeholder="Enter legal issue, statute, or party names..."
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && handleSearch()}
             />
             <button className="go-btn" onClick={() => handleSearch()} disabled={loading}>
                {loading ? "Searching..." : "Search"}
             </button>
           </div>
           
           <div className="search-suggestion-bar">
              <span className="sugg-label">Try searching for:</span>
              <div className="sugg-list">
                {suggestionCases.map(caseName => (
                  <button key={caseName} className="sugg-tag" onClick={() => handleSearch(caseName)}>
                    {caseName}
                  </button>
                ))}
              </div>
           </div>
         </div>
      </header>

      {/* ── Results Main Area ── */}
      <main className="lex-main-content">
        {error && <div className="lex-error-alert"><strong>Search Error:</strong> {error}</div>}

        {loading && (
          <div className="lex-loader">
             <div className="spinning-law-icon">⚖️</div>
             <p>Scanning legal database...</p>
          </div>
        )}

        {!loading && result && result.answer && (
           <div className="ai-insight-box">
              <div className="insight-badge">AI JUDGMENT INSIGHT</div>
              <p className="insight-text">{result.answer}</p>
           </div>
        )}

        {!loading && result && result.sources && result.sources.length > 0 && (
          <div className="results-container">
             <div className="results-header">Showing {result.sources.length} matching precedents</div>
             <div className="lex-results-grid">
               {result.sources.map((src, i) => (
                 <SourceCard key={i} idx={i} src={src} />
               ))}
             </div>
          </div>
        )}

        {!loading && !result && !error && (
           <div className="lex-empty-state">
              <p>Type your query above to begin semantic legal research.</p>
           </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="lex-footer-area">
         <p>© 2026 LexSearch AI — Built for the Indian Legal Community</p>
      </footer>
    </div>
  );
}
