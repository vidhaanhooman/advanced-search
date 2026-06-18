"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NOW } from "@/lib/mockConversations";

interface RangeCalendarProps {
  from: string | null; // yyyy-mm-dd
  to: string | null;
  onChange: (from: string, to: string) => void;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const TODAY = new Date(NOW).toISOString().slice(0, 10);
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const pad = (n: number) => String(n).padStart(2, "0");
const dstr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

interface Cell {
  y: number;
  m: number;
  d: number;
  inMonth: boolean;
}

/**
 * Two-click range calendar (Date Picker / Range Calendar). First click sets the
 * start, second sets the end; the in-between days are shaded and the endpoints
 * are highlighted. Drives the date filter as yyyy-mm-dd from/to strings.
 */
export function RangeCalendar({ from, to, onChange }: RangeCalendarProps) {
  const init = to || from;
  const [view, setView] = useState({
    y: init ? Number(init.slice(0, 4)) : 2026,
    m: init ? Number(init.slice(5, 7)) - 1 : 5,
  });
  const [pending, setPending] = useState<string | null>(null);

  // Monday-first: shift Sunday(0) to the end.
  const startWd = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const prevDays = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();

  const cells: Cell[] = [];
  for (let i = 0; i < startWd; i++) {
    cells.push({
      y: view.m === 0 ? view.y - 1 : view.y,
      m: (view.m + 11) % 12,
      d: prevDays - startWd + 1 + i,
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysIn; d++) cells.push({ y: view.y, m: view.m, d, inMonth: true });
  let nd = 1;
  while (cells.length < 42) {
    cells.push({
      y: view.m === 11 ? view.y + 1 : view.y,
      m: (view.m + 1) % 12,
      d: nd++,
      inMonth: false,
    });
  }

  // While picking, only the pending start is shown; otherwise the full range.
  const lo = pending ?? from;
  const hi = pending ?? to;

  function click(c: Cell) {
    const day = dstr(c.y, c.m, c.d);
    if (pending) {
      const start = pending <= day ? pending : day;
      const end = pending <= day ? day : pending;
      onChange(start, end);
      setPending(null);
    } else {
      setPending(day);
      onChange(day, day);
    }
  }

  function nav(delta: number) {
    setView((v) => {
      let m = v.m + delta;
      let y = v.y;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { y, m };
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-2.5">
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => nav(-1)}
          aria-label="Previous month"
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-text">
          {MONTHS[view.m]} {view.y}
        </span>
        <button
          type="button"
          onClick={() => nav(1)}
          aria-label="Next month"
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] text-text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((c, i) => {
          const day = dstr(c.y, c.m, c.d);
          const isStart = !!lo && day === lo;
          const isEnd = !!hi && day === hi;
          const between = !!lo && !!hi && day > lo && day < hi;
          const isToday = day === TODAY;
          let cls: string;
          if (isStart || isEnd) {
            const round = isStart && isEnd ? "rounded-lg" : isStart ? "rounded-l-lg" : "rounded-r-lg";
            cls = `bg-white font-medium text-black ${round}`;
          } else if (between) {
            cls = "bg-white/15 text-text";
          } else {
            cls = `${c.inMonth ? "text-text" : "text-text-muted"} rounded-lg hover:bg-surface-2 ${
              isToday ? "ring-1 ring-inset ring-border-strong" : ""
            }`;
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => click(c)}
              className={`h-9 text-sm transition-colors ${cls}`}
            >
              {c.d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
