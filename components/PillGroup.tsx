"use client";

import type { NumericFilter } from "@/lib/types";

interface PillGroupProps {
  label?: string;
  /** Stored as op:"=" for exact counts, op:">=" for the "6+" pill, null = Any. */
  value: NumericFilter | null;
  onChange: (value: NumericFilter | null) => void;
  /** Highest exact pill before the "N+" pill — the trailing pill becomes "(maxExact)+". */
  maxExact?: number;
}

/** Airbnb "Rooms and Beds" style: Any · 1 · 2 · 3 · 4 · 5+ segmented pills. */
export function PillGroup({ label, value, onChange, maxExact = 4 }: PillGroupProps) {
  const exact = value && value.op === "=" ? value.value : null;
  const plus = value && value.op === ">=" ? value.value : null;
  const plusValue = maxExact + 1;

  const pills = [
    { key: "any", label: "Any", selected: value == null || value.value == null },
    ...Array.from({ length: maxExact }, (_, i) => i + 1).map((n) => ({
      key: String(n),
      label: String(n),
      selected: exact === n,
    })),
    { key: "plus", label: `${plusValue}+`, selected: plus === plusValue },
  ];

  function pick(key: string) {
    if (key === "any") onChange(null);
    else if (key === "plus")
      onChange({ op: ">=", value: plusValue, value2: null });
    else onChange({ op: "=", value: Number(key), value2: null });
  }

  return (
    <div className="space-y-1.5">
      {label && <span className="block text-sm text-text-dim">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {pills.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={p.selected}
            onClick={() => pick(p.key)}
            className={`h-9 min-w-9 rounded-lg border px-3.5 text-sm transition-colors ${
              p.selected
                ? "border-text bg-text text-bg"
                : "border-border-strong bg-surface text-text-dim hover:border-text-dim hover:text-text"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
