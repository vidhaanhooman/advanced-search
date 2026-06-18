"use client";

import { useMemo } from "react";
import { RefreshCw, Download } from "lucide-react";
import { Toolbar } from "@/components/Toolbar";
import { LogsTable } from "@/components/LogsTable";
import { FilterChip } from "@/components/FilterChip";
import { useFilters } from "@/lib/useFilters";
import { MOCK_CONVERSATIONS } from "@/lib/mockConversations";
import { applyFilters, activeChips, drawerActiveCount } from "@/lib/filters";

export default function Page() {
  const [filters, dispatch] = useFilters();

  const total = MOCK_CONVERSATIONS.length;
  const rows = useMemo(() => applyFilters(MOCK_CONVERSATIONS, filters), [filters]);
  const chips = useMemo(() => activeChips(filters), [filters]);
  const filterBadge = drawerActiveCount(filters);

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="rounded-2xl border border-border bg-surface/40">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <h1 className="text-xl font-semibold text-text">Conversation logs</h1>
            <p className="mt-1 text-sm text-text-dim">
              Search to jump to a known call · filter to narrow the set
            </p>
            <p className="mt-1 text-xs text-text-muted">
              <span className="tabular-nums text-text-dim">{rows.length}</span> of{" "}
              <span className="tabular-nums">{total}</span> conversations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong bg-surface px-3 text-sm text-text-dim hover:bg-surface-2 hover:text-text"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-medium text-black hover:bg-white/90"
            >
              <Download size={14} /> Report
            </button>
          </div>
        </header>

        <div className="px-5 py-4 sm:px-6">
          {/* Tier 1 toolbar */}
          <Toolbar
            filters={filters}
            dispatch={dispatch}
            drawerBadge={filterBadge}
            matchCount={rows.length}
            total={total}
          />

          {/* Active-filter chip row */}
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <FilterChip
                  key={chip.id}
                  label={chip.label}
                  onRemove={() => dispatch({ type: "REMOVE_CHIP", chipId: chip.id })}
                />
              ))}
              <button
                type="button"
                onClick={() => dispatch({ type: "RESET_ALL" })}
                className="ml-1 text-xs text-text-muted underline-offset-2 hover:text-text hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Table */}
          <div className="mt-4">
            <LogsTable rows={rows} />
          </div>
        </div>
      </div>
    </main>
  );
}
