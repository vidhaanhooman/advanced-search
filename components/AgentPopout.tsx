"use client";

import { useState } from "react";
import { Bot, Check, Search } from "lucide-react";
import { AGENTS } from "@/lib/mockConversations";
import type { AgentKind, AgentSelection } from "@/lib/types";
import type { FilterAction } from "@/lib/useFilters";

interface AgentPopoutProps {
  /** Current agent → version-ids selection. */
  agents: AgentSelection;
  dispatch: React.Dispatch<FilterAction>;
  /** Apply (e.g. close the flyout). */
  onApply?: () => void;
}

const KIND_LABEL: Record<AgentKind, string> = {
  conversation: "Conversation",
  broadcast: "Broadcast",
};

const CARD = "rounded-lg border border-border-strong bg-surface shadow-xl shadow-black/40";

/**
 * Two SEPARATE side-by-side cards. The right card is the agent picker (always).
 * When the chosen agent has versions, a distinct card appears to its LEFT for
 * version selection. Each card carries its own border/shadow and the cards are
 * spaced apart so they read as independent popouts. Selections apply live.
 */
export function AgentPopout({ agents, dispatch, onApply }: AgentPopoutProps) {
  const selectedName = Object.keys(agents)[0] ?? null;
  const selectedDef = AGENTS.find((a) => a.name === selectedName) ?? null;
  const pickedVersions = (selectedName ? agents[selectedName] : null) ?? [];
  const showVersions = !!selectedDef && selectedDef.versions.length > 0;

  const ensure = () => dispatch({ type: "ADD_CONDITION", field: "agent" });
  const setAgents = (next: AgentSelection) => {
    ensure();
    dispatch({ type: "UPDATE_CONDITION", id: "agent", patch: { agents: next } });
  };
  const selectAgent = (name: string) => {
    if (name === selectedName) setAgents({});
    // Default: no versions checked — empty array already matches all versions in filter logic.
    else setAgents({ [name]: [] });
  };
  const toggleVersion = (vid: string) => {
    if (!selectedName) return;
    dispatch({ type: "TOGGLE_AGENT_VERSION", id: "agent", agent: selectedName, version: vid });
  };
  const clear = () => dispatch({ type: "REMOVE_CONDITION", id: "agent" });

  return (
    <div className="flex items-stretch justify-end gap-1">
      {showVersions && (
        <div className={`${CARD} flex w-[220px] shrink-0 flex-col`}>
          <VersionCard
            versions={selectedDef!.versions}
            picked={pickedVersions}
            onToggle={toggleVersion}
          />
        </div>
      )}

      <div className={`${CARD} flex w-[400px] shrink-0 flex-col`}>
        <AgentCard selectedName={selectedName} onPick={selectAgent} />
        <Footer onClear={clear} onApply={onApply} />
      </div>
    </div>
  );
}

function AgentCard({
  selectedName,
  onPick,
}: {
  selectedName: string | null;
  onPick: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const list = AGENTS.filter((a) => a.name.toLowerCase().includes(query) || a.id.toLowerCase().includes(query));

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-medium text-text">
        <Bot size={13} className="text-text-muted" /> Agent
      </div>
      <div className="p-2">
        <div className="flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2.5">
          <Search size={13} className="shrink-0 text-text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search agents…"
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      <ul className="max-h-[260px] overflow-y-auto px-1 pb-1 scroll-thin">
        {list.map((a) => {
          const on = a.name === selectedName;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onPick(a.name)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                  on ? "bg-surface-2" : "hover:bg-surface-2/60"
                }`}
              >
                <CheckBox checked={on} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${on ? "font-medium text-text" : "text-text-dim"}`}>{a.name}</span>
                  <span className="block truncate font-mono text-[10px] text-text-muted">{a.id}</span>
                </span>
                <span className="shrink-0 rounded border border-border-strong px-1.5 py-0.5 text-[10px] text-text-muted">
                  {KIND_LABEL[a.kind]}
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="px-3 py-5 text-center text-sm text-text-muted">No agents.</li>}
      </ul>
    </>
  );
}

function VersionCard({
  versions,
  picked,
  onToggle,
}: {
  versions: { id: string; name: string }[];
  picked: string[];
  onToggle: (vid: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Versions</span>
        <span className="text-[10px] tabular-nums text-text-muted">{picked.length}/{versions.length}</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-1 py-1 scroll-thin">
        {versions.map((v) => {
          const on = picked.includes(v.id);
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onToggle(v.id)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-surface-2/60"
              >
                <CheckBox checked={on} />
                <span className={`truncate text-sm ${on ? "text-text" : "text-text-dim"}`}>{v.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border px-3 py-1.5 text-[10px] text-text-muted">
        Select none to match all versions.
      </div>
    </div>
  );
}

function Footer({ onClear, onApply }: { onClear: () => void; onApply?: () => void }) {
  return (
    <div className="flex items-center justify-between border-t border-border px-2 py-2">
      <button
        type="button"
        onClick={onClear}
        className="rounded-md border border-border-strong px-3 py-1.5 text-xs text-text-dim hover:text-text"
      >
        Clear
      </button>
      {onApply && (
        <button
          type="button"
          onClick={onApply}
          className="rounded-md bg-white px-4 py-1.5 text-xs font-medium text-black hover:bg-white/90"
        >
          Apply
        </button>
      )}
    </div>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
        checked ? "border-white bg-white text-black" : "border-border-strong"
      }`}
    >
      {checked && <Check size={11} strokeWidth={3} />}
    </span>
  );
}
