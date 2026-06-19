"use client";

import { useEffect, useState } from "react";
import { Search, Calendar, Filter as FunnelIcon } from "lucide-react";
import { Popover } from "./Popover";
import { ToolbarButton } from "./ToolbarButton";
import { FilterPopup } from "./FilterPopup";
import { FilterMenu } from "./FilterMenu";
import { RangeCalendar } from "./RangeCalendar";
import { TimeField } from "./TimeField";
import { datePresetLabel, dateWindow } from "@/lib/filters";
import {
  type DatePreset,
  type FilterState,
} from "@/lib/types";
import type { FilterAction } from "@/lib/useFilters";

interface ToolbarProps {
  filters: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  drawerBadge: number;
  total: number;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: null, label: "None" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last24", label: "Last 24 hours" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "last3Months", label: "Last 3 months" },
];

const toDateStr = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function Toolbar({
  filters,
  dispatch,
  drawerBadge,
  total,
}: ToolbarProps) {
  const dateActive = !!filters.date.preset;

  // Current range — reflects preset or custom range, split into date + time.
  let rawFrom: string | null;
  let rawTo: string | null;
  if (filters.date.preset === "custom") {
    rawFrom = filters.date.from;
    rawTo = filters.date.to;
  } else {
    const w = dateWindow(filters.date);
    rawFrom = w ? toDateStr(w[0]) : null;
    rawTo = w ? toDateStr(w[1]) : null;
  }
  const fromDate = rawFrom ? rawFrom.slice(0, 10) : null;
  const toDate = rawTo ? rawTo.slice(0, 10) : null;
  const fromTime = rawFrom?.includes("T") ? rawFrom.slice(11, 16) : "00:00";
  const toTime = rawTo?.includes("T") ? rawTo.slice(11, 16) : "23:59";

  const applyRange = (fd: string | null, td: string | null, ft: string, tt: string) =>
    dispatch({
      type: "DATE_CUSTOM",
      from: fd ? `${fd}T${ft}` : null,
      to: td ? `${td}T${tt}` : null,
    });

  // Filter modal open state (dismiss on Escape)
  const [filterOpen, setFilterOpen] = useState(false);
  // Pin the filter dropdown open for testing — disables outside-click & Escape close.
  const [filterPinned, setFilterPinned] = useState(false);
  useEffect(() => {
    if (!filterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [filterOpen]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Plain search input — scoped to conversation id only */}
      <div className="flex h-9 items-center rounded-lg border border-border-strong bg-surface px-3 focus-within:ring-1 focus-within:ring-accent/40">
        <Search size={14} className="text-text-muted" />
        <input
          value={filters.search.query}
          onChange={(e) => dispatch({ type: "SEARCH_QUERY", query: e.target.value })}
          placeholder="Search by conversation id…"
          aria-label="Search query"
          className="w-72 bg-transparent px-2 text-sm text-text outline-none placeholder:text-text-muted"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Date popover with presets + range selector */}
        <Popover
          align="right"
          width={620}
          trigger={({ open, toggle }) => (
            <ToolbarButton
              icon={<Calendar size={14} />}
              label={dateActive ? datePresetLabel(filters.date) : "Date"}
              active={dateActive}
              open={open}
              onClick={toggle}
            />
          )}
        >
          {({ close }) => (
            <div className="flex">
              {/* preset sidebar — matches FilterMenu row style */}
              <div className="w-40 shrink-0 border-r border-border py-1">
                <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Quick range
                </div>
                {DATE_PRESETS.map((p) => {
                  const on = filters.date.preset === p.value;
                  return (
                    <button
                      key={String(p.value)}
                      type="button"
                      onClick={() => dispatch({ type: "DATE_PRESET", preset: p.value })}
                      className={`flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm transition-colors ${
                        on ? "bg-surface-2 text-text" : "text-text-dim hover:bg-surface-2/60 hover:text-text"
                      }`}
                    >
                      <span className="flex-1 truncate">{p.label}</span>
                      {on && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    </button>
                  );
                })}
              </div>

              {/* calendar + time + actions */}
              <div className="flex-1 space-y-3 p-3">
                <RangeCalendar
                  from={fromDate}
                  to={toDate}
                  onChange={(from, to) => applyRange(from, to, fromTime, toTime)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <TimeField
                    label="Start time"
                    value={fromTime}
                    onChange={(v) => applyRange(fromDate, toDate, v || "00:00", toTime)}
                  />
                  <TimeField
                    label="End time"
                    value={toTime}
                    onChange={(v) => applyRange(fromDate, toDate, fromTime, v || "23:59")}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "DATE_PRESET", preset: null })}
                    className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-text-dim hover:text-text"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md bg-white px-4 py-1.5 text-xs font-medium text-black hover:bg-white/90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </Popover>

        {/* Filter dropdown menu — categories + flyout submenus; Advanced opens the modal */}
        <Popover
          align="right"
          width={300}
          disableClose={filterPinned}
          blockBackground
          trigger={({ open, toggle }) => (
            <ToolbarButton
              icon={<FunnelIcon size={14} />}
              label="Filter"
              active={drawerBadge > 0}
              badge={drawerBadge}
              open={open}
              chevron={false}
              onClick={toggle}
            />
          )}
        >
          {({ close }) => (
            <FilterMenu
              filters={filters}
              dispatch={dispatch}
              onOpenAdvanced={() => {
                close();
                setFilterOpen(true);
              }}
              close={close}
              pinned={filterPinned}
              onTogglePin={() => setFilterPinned((p) => !p)}
            />
          )}
        </Popover>
      </div>

      <FilterPopup
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        dispatch={dispatch}
        total={total}
      />
    </div>
  );
}
