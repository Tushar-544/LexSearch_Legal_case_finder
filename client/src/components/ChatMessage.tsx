/**
 * ChatMessage.tsx
 * ───────────────
 * Renders a single chat bubble — user or AI.
 * AI messages can include sources, key_points, summary, and suggestions.
 */

import { useState } from "react";

export interface Source {
  case_id: string;
  case_no: string | null;
  case_title?: string;
  petitioner: string | null;
  respondent: string | null;
  judge: string | null;
  decision_date: string | null;
  year: number | null;
  text: string;
  pdf_url: string;
  score: number;
}

export interface ChatMsg {
  id: string;
  role: "user" | "ai";
  content: string;
  sources?: Source[];
  suggestions?: string[];
  key_points?: string[];
  summary?: string;
  timestamp: number;
}

interface ChatMessageProps {
  message: ChatMsg;
  onSuggestionClick?: (text: string) => void;
  onSummarize?: (text: string) => Promise<string>;
  queryText?: string;
}

/* ── Helpers ── */
function getKanoonLink(src: Source) {
  const q =
    src.case_no ||
    src.case_title ||
    `${src.petitioner || ""} vs ${src.respondent || ""}`;
  return `https://indiankanoon.org/search/?formInput=${encodeURIComponent(q)}`;
}

function confidenceLabel(score: number) {
  if (score >= 0.7) return { label: "High", cls: "conf-high" };
  if (score >= 0.4) return { label: "Medium", cls: "conf-medium" };
  return { label: "Low", cls: "conf-low" };
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return text;
  const regex = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(regex);
  return parts;
}

/** Only render a detail row if the value is non-null/non-empty */
function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="detail-item">
      <strong>{label}:</strong> {value}
    </div>
  );
}

/* ── Mini Source Card inside chat ── */
function ChatSourceCard({
  src,
  idx,
  queryText,
  onSummarize,
}: {
  src: Source;
  idx: number;
  queryText?: string;
  onSummarize?: (text: string) => Promise<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [sumLoading, setSumLoading] = useState(false);
  const conf = confidenceLabel(src.score);

  const handleSummarize = async () => {
    if (summary || !onSummarize) return;
    setSumLoading(true);
    try {
      const s = await onSummarize(src.text);
      setSummary(s);
    } catch {
      setSummary("Error generating summary.");
    } finally {
      setSumLoading(false);
    }
  };

  const renderHighlighted = (text: string) => {
    const parts = highlightText(text, queryText || "");
    if (typeof parts === "string") return <>{parts}</>;
    const words = (queryText || "")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    if (words.length === 0) return <>{text}</>;
    const regex = new RegExp(
      `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
      "gi"
    );
    return (
      <>
        {(parts as string[]).map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="kw-highlight">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  };

  // Build display title
  const displayTitle =
    src.case_title || src.case_no || src.case_id || "Case";

  return (
    <div className="chat-source-card">
      <div className="card-top-header">
        <span className="source-number">#{idx + 1}</span>
        <div className="case-id-group">
          <span className="case-no-pill">{src.case_no || src.case_id || "—"}</span>
          {src.decision_date && (
            <span className="case-year-label">
              {src.decision_date.split("-").pop()}
            </span>
          )}
        </div>
        <div className="conf-score-group">
          <span className={`conf-badge ${conf.cls}`}>{conf.label}</span>
          <span className="relevance-score">
            {(src.score * 100).toPrecision(3)}%
          </span>
        </div>
      </div>

      {/* Case title */}
      {src.case_title && (
        <div className="case-title-line">
          <strong>{src.case_title}</strong>
        </div>
      )}

      {/* Structured details — only show non-null fields */}
      <div className="card-details-grid">
        <DetailItem label="Petitioner" value={src.petitioner} />
        <DetailItem label="Respondent" value={src.respondent} />
        <DetailItem label="Judge" value={src.judge} />
        <DetailItem label="Date" value={src.decision_date} />
      </div>

      {/* Judgment excerpt — already cleaned by backend */}
      <div className="judgment-box">
        <div className={`judgment-text ${!expanded ? "clamped" : ""}`}>
          {renderHighlighted(src.text)}
        </div>
        <div className="box-actions">
          <button
            className="expand-link-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "↑ Show less" : "↓ Read excerpt"}
          </button>
          {!summary && !sumLoading && (
            <button
              className="pill-btn summarizer-trigger"
              onClick={handleSummarize}
            >
              ✨ Explain Simply
            </button>
          )}
          {sumLoading && (
            <span className="pulsing-text">Simplifying...</span>
          )}
        </div>
      </div>

      {summary && (
        <div className="ai-summary-highlight">
          <div className="summary-header">
            <span className="ai-icon">✨</span> AI SIMPLIFIED
          </div>
          <p className="summary-body">{summary}</p>
        </div>
      )}

      <div className="card-footer-buttons">
        {src.pdf_url && (
          <a
            className="footer-btn brand-btn"
            href={
              src.pdf_url.startsWith("http")
                ? src.pdf_url
                : `https://main.sci.gov.in/${src.pdf_url}`
            }
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
          🔍 Indian Kanoon
        </a>
      </div>
    </div>
  );
}

/* ── Main ChatMessage Component ── */
export default function ChatMessage({
  message,
  onSuggestionClick,
  onSummarize,
