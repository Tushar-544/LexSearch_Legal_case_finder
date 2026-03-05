/**
 * TimelineView.tsx
 * ────────────────
 * Groups search result sources by year on a vertical timeline.
 */

import { Source } from "./ChatMessage";

interface TimelineViewProps {
  sources: Source[];
  onClose: () => void;
}

interface YearGroup {
  year: string;
  cases: Source[];
}

export default function TimelineView({ sources, onClose }: TimelineViewProps) {
  // Group by year
  const groupMap = new Map<string, Source[]>();
  sources.forEach((src) => {
    const year = src.year
      ? String(src.year)
      : src.decision_date?.split("-").pop() || "Unknown";
    if (!groupMap.has(year)) groupMap.set(year, []);
    groupMap.get(year)!.push(src);
  });

  const groups: YearGroup[] = Array.from(groupMap.entries())
    .map(([year, cases]) => ({ year, cases }))
    .sort((a, b) => {
      const ya = parseInt(a.year) || 0;
      const yb = parseInt(b.year) || 0;
      return yb - ya; // Most recent first
    });

  return (
    <div className="timeline-overlay">
      <div className="timeline-container">
        <div className="timeline-header">
          <h3>📅 Timeline View</h3>
          <button className="close-panel-btn" onClick={onClose}>✕</button>
        </div>

        {groups.length === 0 ? (
          <p className="timeline-empty">No cases to display on timeline.</p>
        ) : (
          <div className="timeline-track">
            {groups.map((group) => (
              <div key={group.year} className="timeline-year-block">
                <div className="timeline-year-badge">{group.year}</div>
                <div className="timeline-year-cases">
                  {group.cases.map((src, i) => (
                    <div key={i} className="timeline-case-pill">
                      <strong>{src.case_no || src.case_id}</strong>
                      <span>
                        {src.petitioner} vs {src.respondent}
                      </span>
                      <span className="tl-judge">{src.judge}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
