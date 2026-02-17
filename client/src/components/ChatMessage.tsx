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
