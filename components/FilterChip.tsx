"use client";

import { X } from "lucide-react";

interface FilterChipProps {
  label: string;
  onRemove: () => void;
  /** Tailwind bg-* class for the leading status dot. */
  dot?: string;
}

/**
 * Removable active-filter chip. Label is split on the first ": " so the field
 * key renders dimmed and the value bright (e.g. "Status:" + "Active").
 */
export function FilterChip({ label, onRemove, dot = "bg-emerald-400" }: FilterChipProps) {
  const idx = label.indexOf(": ");
  const key = idx === -1 ? null : label.slice(0, idx + 1);
  const value = idx === -1 ? label : label.slice(idx + 2);

  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 py-1 pl-2.5 pr-1.5 text-xs">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="max-w-[280px] truncate">
        {key && <span className="text-text-muted">{key} </span>}
        <span className="text-text">{value}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="flex h-4 w-4 items-center justify-center rounded text-text-muted hover:bg-border-strong hover:text-text"
      >
        <X size={12} />
      </button>
    </span>
  );
}
