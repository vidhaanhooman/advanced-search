"use client";

import { useState } from "react";
import { X } from "lucide-react";

export interface TokenOption {
  value: string;
  label: string;
  dot?: string;
  count?: number;
}

interface TokenMultiSelectProps {
  placeholder: string;
  options: TokenOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

/**
 * Searchable token multi-select for large / growing option sets (e.g. Outcomes).
 * Selected values show as removable chips; typing filters a dropdown to add more.
 * The dropdown renders in-flow (no overlay) so it never clips in a scroll modal.
 */
export function TokenMultiSelect({ placeholder, options, selected, onToggle }: TokenMultiSelectProps) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const query = q.trim().toLowerCase();
  const byValue = Object.fromEntries(options.map((o) => [o.value, o]));
  const available = options.filter((o) => !selected.includes(o.value) && o.label.toLowerCase().includes(query));
  const showList = open || query.length > 0;

  return (
    <div>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-border-strong bg-surface-2 px-2 py-1.5 focus-within:border-white">
        {selected.map((v) => {
          const o = byValue[v];
          return (
            <span key={v} className="inline-flex items-center gap-1.5 rounded-md bg-surface px-2 py-0.5 text-xs text-text">
              {o?.dot && <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} />}
              {o?.label ?? v}
              <button type="button" onClick={() => onToggle(v)} aria-label={`Remove ${o?.label ?? v}`} className="text-text-muted hover:text-text">
                <X size={11} />
              </button>
            </span>
          );
        })}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={selected.length ? "" : placeholder}
          className="min-w-[100px] flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
        />
      </div>

      {showList && (
        <ul className="mt-1 max-h-56 overflow-auto rounded-lg border border-border-strong bg-surface scroll-thin">
          {available.length === 0 ? (
            <li className="px-3 py-2 text-xs text-text-muted">{query ? "No matches." : "All selected."}</li>
          ) : (
            available.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onToggle(o.value);
                    setQ("");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-dim hover:bg-surface-2 hover:text-text"
                >
                  {o.dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${o.dot}`} />}
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.count != null && <span className="shrink-0 tabular-nums text-xs text-text-muted">{o.count}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
