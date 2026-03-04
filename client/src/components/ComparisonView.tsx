/**
 * ComparisonView.tsx
 * ──────────────────
 * Side-by-side case comparison view.
 */

import { Source } from "./ChatMessage";

interface ComparisonViewProps {
  cases: Source[];
  onClose: () => void;
}

export default function ComparisonView({ cases, onClose }: ComparisonViewProps) {
  if (cases.length < 2) {
    return (
      <div className="comparison-overlay">
        <div className="comparison-container">
          <div className="comparison-header">
            <h3>⚖️ Case Comparison</h3>
            <button className="close-panel-btn" onClick={onClose}>✕</button>
          </div>
          <p className="comparison-empty">
            Select at least 2 cases from the results to compare.
          </p>
        </div>
      </div>
    );
  }

  const fields: { label: string; key: keyof Source }[] = [
    { label: "Case No.", key: "case_no" },
    { label: "Petitioner", key: "petitioner" },
    { label: "Respondent", key: "respondent" },
    { label: "Judge", key: "judge" },
    { label: "Decision Date", key: "decision_date" },
    { label: "Relevance", key: "score" },
  ];

  return (
    <div className="comparison-overlay">
      <div className="comparison-container">
        <div className="comparison-header">
          <h3>⚖️ Case Comparison ({cases.length} cases)</h3>
          <button className="close-panel-btn" onClick={onClose}>✕</button>
        </div>

        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Field</th>
                {cases.map((c, i) => (
                  <th key={i}>Case #{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map(({ label, key }) => (
                <tr key={key}>
                  <td className="comp-label">{label}</td>
                  {cases.map((c, i) => (
                    <td key={i}>
                      {key === "score"
                        ? `${((c[key] as number) * 100).toPrecision(3)}%`
                        : String(c[key] || "N/A")}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="comp-label">Excerpt</td>
                {cases.map((c, i) => (
                  <td key={i} className="comp-excerpt">
                    {c.text?.slice(0, 300)}...
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
