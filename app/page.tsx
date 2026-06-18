"use client";

import { useMemo } from "react";
import { RefreshCw, Download } from "lucide-react";
import { Toolbar } from "@/components/Toolbar";
import { LogsTable } from "@/components/LogsTable";
import { FilterChip } from "@/components/FilterChip";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
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
    <div className="flex h-screen overflow-hidden bg-bg">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto scroll-thin">
        <div className="mx-auto max-w-[1280px] px-6 py-7">
          {/* Header */}
          <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-text">Conversation Logs</h1>
              <p className="mt-1 text-sm text-text-dim">
                Search to jump to a known call · filter to narrow the set
              </p>
              <p className="mt-1 text-xs text-text-muted">
                <span className="tabular-nums text-text-dim">{rows.length}</span> of{" "}
                <span className="tabular-nums">{total}</span> conversations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="default">
                <RefreshCw size={14} /> Refresh
              </Button>
              <Button variant="primary">
                <Download size={14} /> Report
              </Button>
            </div>
          </header>

          <div>
          {/* Tier 1 toolbar */}
          <Toolbar
            filters={filters}
            dispatch={dispatch}
            drawerBadge={filterBadge}
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
    </div>
  );
}
