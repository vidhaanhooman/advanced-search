"use client";

import { Check } from "lucide-react";

export interface Option {
  value: string;
  label: string;
  /** Tailwind bg-* class for a leading status dot. */
  dot?: string;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Trailing count. */
  count?: number;
  /** Tooltip detail shown on hover. */
  hint?: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
  /** "list" = stacked rows (with checkbox); "chips" = horizontal wrapping pills. */
  layout?: "list" | "chips";
  /** Optional renderer for extra UI under a selected option (list layout only). */
  renderExtra?: (value: string, selected: boolean) => React.ReactNode;
  emptyHint?: string;
}

/**
 * Reusable multi-select. `list` renders stacked menu/command-item rows; `chips`
 * renders horizontal wrapping toggle pills. Both carry an optional status dot +
 * trailing count. Reused by Agent (list), Outcome / Call status / End reason
 * (chips), Direction, etc.
 */
export function MultiSelect({
  options,
  selected,
  onToggle,
  layout = "list",
  renderExtra,
  emptyHint,
}: MultiSelectProps) {
  if (!options.length && emptyHint) {
    return <p className="px-3 py-2 text-xs text-text-muted">{emptyHint}</p>;
  }

  if (layout === "chips") {
    return (
      <div className="flex flex-wrap gap-2" role="listbox" aria-multiselectable>
        {options.map((opt) => {
          const isSel = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={isSel}
              onClick={() => onToggle(opt.value)}
              title={opt.hint}
              className={`inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                isSel
                  ? "border-text bg-surface-2 text-text"
                  : "border-border-strong text-text-dim hover:border-text-dim hover:text-text"
              }`}
            >
              {opt.icon && <span className="shrink-0 text-text-muted">{opt.icon}</span>}
              {opt.dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${opt.dot}`} />}
              <span className="truncate">{opt.label}</span>
              {opt.count != null && (
                <span className="tabular-nums text-xs text-text-muted">{opt.count}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <ul className="max-h-72 space-y-0.5 overflow-auto py-0.5 scroll-thin" role="listbox" aria-multiselectable>
      {options.map((opt) => {
        const isSel = selected.includes(opt.value);
        return (
          <li key={opt.value}>
            <button
              type="button"
              role="option"
              aria-selected={isSel}
              onClick={() => onToggle(opt.value)}
              className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                isSel
                  ? "bg-surface-2 text-text"
                  : "text-text-dim hover:bg-surface-2/60 hover:text-text"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  isSel ? "border-white bg-white text-black" : "border-border-strong"
                }`}
              >
                {isSel && <Check size={11} strokeWidth={3} />}
              </span>
              {opt.icon && <span className="shrink-0 text-text-muted">{opt.icon}</span>}
              {opt.dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${opt.dot}`} />}
              <span className="flex-1 truncate">{opt.label}</span>
              {opt.count != null && (
                <span className="shrink-0 tabular-nums text-xs text-text-muted">{opt.count}</span>
              )}
            </button>
            {renderExtra?.(opt.value, isSel)}
          </li>
        );
      })}
    </ul>
  );
}
