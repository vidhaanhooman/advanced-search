"use client";

import { useEffect, useState } from "react";
import { Search, Calendar, Filter as FunnelIcon } from "lucide-react";
import { Popover } from "./Popover";
import { ToolbarButton } from "./ToolbarButton";
import { FilterPopup } from "./FilterPopup";
import { RangeCalendar } from "./RangeCalendar";
import { datePresetLabel, dateWindow } from "@/lib/filters";
import {
  SEARCH_FIELDS,
  TYPE_SEGMENTS,
  type ConversationType,
  type DatePreset,
  type FilterState,
  type SearchField,
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
  const searchLabel =
    SEARCH_FIELDS.find((f) => f.value === filters.search.field)?.label ?? "";

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
      {/* Scoped search: field dropdown + input */}
      <div className="flex h-9 items-stretch rounded-lg border border-border-strong bg-surface focus-within:ring-1 focus-within:ring-accent/40">
        <Popover
          width={200}
          trigger={({ open, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className="flex h-full items-center gap-1.5 rounded-l-lg border-r border-border bg-surface-2 px-3 text-sm text-text-dim hover:text-text focus-visible:outline-none"
            >
              {searchLabel}
              <svg width="12" height="12" viewBox="0 0 24 24" className="text-text-muted">
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </button>
          )}
        >
          {({ close }) => (
            <ul className="py-1">
              {SEARCH_FIELDS.map((f) => (
                <li key={f.value}>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch({ type: "SEARCH_FIELD", field: f.value as SearchField });
                      close();
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                      filters.search.field === f.value ? "text-text" : "text-text-dim"
                    }`}
                  >
                    {f.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Popover>
        <div className="flex items-center pl-3 text-text-muted">
          <Search size={14} />
        </div>
        <input
          value={filters.search.query}
          onChange={(e) => dispatch({ type: "SEARCH_QUERY", query: e.target.value })}
          placeholder={`Search by ${searchLabel.toLowerCase()}…`}
          aria-label="Search query"
          className="w-60 bg-transparent px-2 text-sm text-text outline-none placeholder:text-text-muted"
        />
      </div>

      {/* Segmented type: All / Call / Web */}
      <div className="flex h-9 items-center rounded-lg border border-border-strong bg-surface p-0.5">
        {TYPE_SEGMENTS.map((seg) => {
          const active = filters.type === seg.value;
          return (
            <button
              key={seg.label}
              type="button"
              onClick={() =>
                dispatch({ type: "SET_TYPE", value: seg.value as ConversationType | null })
              }
              className={`h-8 rounded-md px-3 text-sm transition-colors ${
                active
                  ? "bg-surface-2 text-text shadow-sm"
                  : "text-text-dim hover:text-text"
              }`}
            >
              {seg.label}
            </button>
          );
        })}
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
              {/* preset sidebar */}
              <div className="w-44 shrink-0 space-y-0.5 border-r border-border p-2">
                {DATE_PRESETS.map((p) => {
                  const on = filters.date.preset === p.value;
                  return (
                    <button
                      key={String(p.value)}
                      type="button"
                      onClick={() => dispatch({ type: "DATE_PRESET", preset: p.value })}
                      className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        on ? "bg-surface-2 text-text" : "text-text-dim hover:bg-surface-2/60 hover:text-text"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* calendar + time + actions */}
              <div className="flex-1 space-y-3 p-4">
                <RangeCalendar
                  from={fromDate}
                  to={toDate}
                  onChange={(from, to) => applyRange(from, to, fromTime, toTime)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <label className="block rounded-lg border border-border-strong bg-surface-2 px-3 py-2">
                    <span className="block text-[11px] text-text-muted">Start time</span>
                    <input
                      type="time"
                      value={fromTime}
                      onChange={(e) => applyRange(fromDate, toDate, e.target.value || "00:00", toTime)}
                      className="w-full bg-transparent text-sm text-text outline-none [color-scheme:dark]"
                    />
                  </label>
                  <label className="block rounded-lg border border-border-strong bg-surface-2 px-3 py-2">
                    <span className="block text-[11px] text-text-muted">End time</span>
                    <input
                      type="time"
                      value={toTime}
                      onChange={(e) => applyRange(fromDate, toDate, fromTime, e.target.value || "23:59")}
                      className="w-full bg-transparent text-sm text-text outline-none [color-scheme:dark]"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "DATE_PRESET", preset: null })}
                    className="rounded-md px-3 py-2 text-sm text-text-dim hover:bg-surface-2 hover:text-text"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md bg-white px-5 py-2 text-sm font-medium text-black hover:bg-white/90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </Popover>

        {/* Filter modal trigger with active-count badge */}
        <ToolbarButton
          icon={<FunnelIcon size={14} />}
          label="Filter"
          active={drawerBadge > 0}
          badge={drawerBadge}
          open={filterOpen}
          chevron={false}
          onClick={() => setFilterOpen(true)}
        />
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
