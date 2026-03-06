/**
 * ExportButton.tsx
 * ────────────────
 * Exports the current set of results as a JSON file download.
 */

import { Source } from "./ChatMessage";

interface ExportButtonProps {
  sources: Source[];
  query: string;
}

export default function ExportButton({ sources, query }: ExportButtonProps) {
  const handleExport = () => {
    if (sources.length === 0) return;

    const exportData = {
      exported_at: new Date().toISOString(),
      query,
      total_results: sources.length,
      results: sources.map((s) => ({
        case_no: s.case_no,
        case_id: s.case_id,
        petitioner: s.petitioner,
        respondent: s.respondent,
        judge: s.judge,
        decision_date: s.decision_date,
        relevance_score: `${(s.score * 100).toPrecision(3)}%`,
        excerpt: s.text?.slice(0, 500),
        pdf_url: s.pdf_url,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lexsearch_results_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      className="nav-action-btn"
      onClick={handleExport}
      disabled={sources.length === 0}
      title="Export results as JSON"
    >
      📥 Export
    </button>
  );
}
