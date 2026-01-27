/**
 * FiltersPanel.tsx
 * ────────────────
 * Advanced filters: year range, judge name, relevance threshold.
 */

import { useState } from "react";

export interface Filters {
  yearMin: string;
  yearMax: string;
  judge: string;
  minScore: string;
}

interface FiltersPanelProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  onClose: () => void;
}

export const DEFAULT_FILTERS: Filters = {
  yearMin: "",
  yearMax: "",
  judge: "",
  minScore: "",
};

export default function FiltersPanel({ filters, onChange, onClose }: FiltersPanelProps) {
  const [local, setLocal] = useState<Filters>({ ...filters });

  const update = (key: keyof Filters, value: string) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  const apply = () => {
    onChange(local);
    onClose();
  };

  const reset = () => {
    const empty = { ...DEFAULT_FILTERS };
    setLocal(empty);
    onChange(empty);
  };

  const hasFilters = Object.values(local).some((v) => v.trim() !== "");

  return (
    <div className="filters-panel">
      <div className="filters-header">
        <h3>🔧 Advanced Filters</h3>
        <button className="close-panel-btn" onClick={onClose}>✕</button>
      </div>

      <div className="filters-body">
        <div className="filter-group">
          <label>Year Range</label>
          <div className="filter-row">
            <input
              type="number"
              placeholder="From (e.g. 2010)"
              value={local.yearMin}
              onChange={(e) => update("yearMin", e.target.value)}
              min="1947"
              max="2026"
            />
            <span className="filter-sep">to</span>
            <input
              type="number"
              placeholder="To (e.g. 2024)"
              value={local.yearMax}
              onChange={(e) => update("yearMax", e.target.value)}
              min="1947"
              max="2026"
            />
          </div>
        </div>

        <div className="filter-group">
          <label>Judge Name</label>
          <input
            type="text"
            placeholder="e.g. Chandrachud, Nariman"
            value={local.judge}
            onChange={(e) => update("judge", e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Minimum Relevance</label>
          <select
            value={local.minScore}
            onChange={(e) => update("minScore", e.target.value)}
          >
            <option value="">Any</option>
            <option value="0.7">High (70%+)</option>
            <option value="0.4">Medium (40%+)</option>
            <option value="0.2">Low (20%+)</option>
          </select>
        </div>
      </div>

      <div className="filters-footer">
        {hasFilters && (
          <button className="filter-reset-btn" onClick={reset}>
            Clear All
          </button>
        )}
        <button className="filter-apply-btn" onClick={apply}>
          Apply Filters
        </button>
      </div>
    </div>
  );
}
