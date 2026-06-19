"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

interface TimeFieldProps {
  label: string;
  /** "HH:MM" 24-hour format */
  value: string;
  onChange: (value: string) => void;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")); // 01..12
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")); // 00..59
const MERIDIEM = ["AM", "PM"] as const;

function to24h(h12: string, mm: string, mer: "AM" | "PM") {
  let h = parseInt(h12, 10) % 12;
  if (mer === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${mm}`;
}

function from24h(value: string) {
  const [hStr = "00", mStr = "00"] = (value || "00:00").split(":");
  const h24 = parseInt(hStr, 10);
  const mer: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 % 12) || 12);
  return { h12: String(h12).padStart(2, "0"), mm: mStr.padStart(2, "0"), mer };
}

/**
 * Compact time picker that matches the rest of the filter UI (no native OS
 * picker). iOS-style 3-column wheel layout: HH / MM / AM·PM. Opens upward so it
 * never falls off-screen when the Date popover sits low in the viewport.
 */
export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const parsed = from24h(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const commit = (h12: string, mm: string, mer: "AM" | "PM") => onChange(to24h(h12, mm, mer));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface-2 px-2.5 py-1.5 text-left hover:border-text-dim"
      >
        <span className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted">{label}</span>
          <span className="text-sm tabular-nums text-text">
            {parsed.h12}:{parsed.mm} <span className="text-text-muted">{parsed.mer}</span>
          </span>
        </span>
        <Clock size={13} className="shrink-0 text-text-muted" />
      </button>

      {open && (
        <div
          // Opens UPWARD so the wheel never overflows the viewport bottom.
          className="absolute bottom-full left-0 right-0 z-40 mb-1 rounded-md border border-border-strong bg-surface p-2 shadow-xl shadow-black/40"
        >
          {/* iOS wheel — 3 columns, center row highlighted by a single rail box that spans all of them */}
          <div className="relative grid grid-cols-3 gap-1">
            <Wheel items={HOURS_12} selected={parsed.h12} onPick={(v) => commit(v, parsed.mm, parsed.mer)} />
            <Wheel items={MINUTES} selected={parsed.mm} onPick={(v) => commit(parsed.h12, v, parsed.mer)} />
            <Wheel
              items={MERIDIEM as unknown as string[]}
              selected={parsed.mer}
              onPick={(v) => commit(parsed.h12, parsed.mm, v as "AM" | "PM")}
            />
            {/* Center-row rail — exactly the row height, centered, top+bottom borders only. */}
            <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-6 -translate-y-1/2 border-y border-border" />
          </div>
        </div>
      )}
    </div>
  );
}

const ROW_H = 24; // px — keep in sync with .h-6 below

function Wheel({
  items,
  selected,
  onPick,
}: {
  items: string[];
  selected: string;
  onPick: (value: string) => void;
}) {
  const ulRef = useRef<HTMLUListElement>(null);

  // Scroll the selected row to the center when opened, and after each pick.
  useEffect(() => {
    const ul = ulRef.current;
    if (!ul) return;
    const idx = items.indexOf(selected);
    if (idx < 0) return;
    // Target so the selected row's center lines up with the container's center.
    ul.scrollTop = idx * ROW_H;
  }, [items, selected]);

  return (
    <div className="relative h-[120px] overflow-hidden">
      <ul
        ref={ulRef}
        className="h-full overflow-y-auto scroll-hidden"
        style={{
          // Spacer top + bottom = 2 rows each so first/last item can center.
          scrollSnapType: "y mandatory",
        }}
      >
        <li style={{ height: ROW_H * 2 }} aria-hidden />
        {items.map((v) => {
          const on = v === selected;
          return (
            <li key={v} style={{ height: ROW_H, scrollSnapAlign: "center" }}>
              <button
                type="button"
                onClick={() => onPick(v)}
                className={`flex h-full w-full items-center justify-center text-sm tabular-nums transition-colors ${
                  on ? "font-semibold text-text" : "text-text-muted hover:text-text"
                }`}
              >
                {v}
              </button>
            </li>
          );
        })}
        <li style={{ height: ROW_H * 2 }} aria-hidden />
      </ul>
      {/* Top + bottom fade masks to suggest the wheel. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface to-transparent" />
    </div>
  );
}
