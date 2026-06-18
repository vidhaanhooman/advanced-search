"use client";

import { ChevronDown } from "lucide-react";

interface ToolbarButtonProps {
  icon?: React.ReactNode;
  label: string;
  /** Highlight when this control holds an active value. */
  active?: boolean;
  open?: boolean;
  badge?: number;
  onClick?: () => void;
  chevron?: boolean;
}

/** Shared trigger button for toolbar dropdown controls. */
export function ToolbarButton({
  icon,
  label,
  active,
  open,
  badge,
  onClick,
  chevron = true,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
        active
          ? "border-border-strong bg-surface-2 text-text"
          : "border-border-strong bg-surface text-text-dim hover:bg-surface-2 hover:text-text"
      } ${open ? "ring-1 ring-border-strong" : ""}`}
    >
      {icon}
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-surface-2 px-1 text-xs font-semibold tabular-nums text-text">
          {badge}
        </span>
      )}
      {chevron && <ChevronDown size={14} className="text-text-muted" />}
    </button>
  );
}
