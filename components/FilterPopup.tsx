"use client";

import { useEffect, useRef, useState } from "react";
import { X, Search, Plus, Check, ChevronDown, Lock, Globe, PhoneIncoming, PhoneOutgoing, Phone, Bot, MessageSquare, Megaphone, Flag, Activity, Fingerprint, ClipboardList, Braces, Calendar, Pencil } from "lucide-react";
import { MultiSelect } from "./MultiSelect";
import { TokenMultiSelect } from "./TokenMultiSelect";
import { RangeSlider } from "./RangeSlider";
import { RangeCalendar } from "./RangeCalendar";
import { PillGroup } from "./PillGroup";
import { AGENTS, agentDef, MOCK_CONVERSATIONS } from "@/lib/mockConversations";
import { OUTCOME_DOT, STATUS_DOT, countBy, distinctValues, numericDomain } from "@/lib/display";
import { applyFilters, conditionIsActive } from "@/lib/filters";
import {
  CALL_STATUSES,
  END_REASONS,
  OUTCOMES,
  type AgentVersion,
  type Condition,
  type ConditionField,
  type FieldDef,
  type FilterState,
  type MatchMode,
  type Operator,
} from "@/lib/types";
import type { FilterAction } from "@/lib/useFilters";

interface FilterPopupProps {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  total: number;
}

export const CNT = {
  outcome: countBy(MOCK_CONVERSATIONS, (c) => c.outcome),
  callStatus: countBy(MOCK_CONVERSATIONS, (c) => c.callInfo.status),
  endReason: countBy(MOCK_CONVERSATIONS, (c) => c.callInfo.endReason),
  agent: countBy(MOCK_CONVERSATIONS, (c) => c.agent),
};

export const TYPE_CARDS = [
  { value: "web", label: "Web", icon: <Globe size={14} /> },
  { value: "call", label: "Call", icon: <Phone size={14} /> },
  { value: "chat", label: "Chat", icon: <MessageSquare size={14} /> },
  { value: "broadcast", label: "Broadcast", icon: <Megaphone size={14} /> },
];

export const DIRECTION_CARDS = [
  { value: "inbound", label: "Inbound", icon: <PhoneIncoming size={14} /> },
  { value: "outbound", label: "Outbound", icon: <PhoneOutgoing size={14} /> },
];

export const RANGE = {
  duration: { min: 0, max: 600, step: 5, unit: "s" },
  turns: { min: 0, max: 50, step: 1 },
  turnLatency: { min: 0, max: 2000, step: 10, unit: "ms" },
} as const;

const MODE_OPTS: { value: MatchMode; label: string }[] = [
  { value: "specific", label: "Specific value" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
];

const NUM_OPS: { value: Operator; label: string }[] = [
  { value: "between", label: "between" },
  { value: ">", label: ">" },
  { value: ">=", label: "≥" },
  { value: "<", label: "<" },
  { value: "<=", label: "≤" },
  { value: "=", label: "=" },
];

const SECTION_TITLES = ["Type", "Agent", "Outcome & status", "Metrics", "Identity", "Post-call analysis", "Context variables"];
const SECTION_ICON: Record<string, React.ReactNode> = {
  Type: <Phone size={13} />,
  Agent: <Bot size={13} />,
  "Outcome & status": <Flag size={13} />,
  Metrics: <Activity size={13} />,
  Identity: <Fingerprint size={13} />,
  "Post-call analysis": <ClipboardList size={13} />,
  "Context variables": <Braces size={13} />,
};
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export function FilterPopup({ open, onClose, filters, dispatch, total }: FilterPopupProps) {
  // View toggle (test), accordion open-state (default all open), resizable size.
  const [view, setView] = useState<"accordion" | "flat">("accordion");
  const [openSet, setOpenSet] = useState<Set<string>>(new Set(SECTION_TITLES));
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 820, h: 720 });
  const resizeStart = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    if (!resizing) return;
    const move = (e: PointerEvent) => {
      const s = resizeStart.current;
      if (!s) return;
      setSize({
        w: clamp(s.w + (e.clientX - s.x) * 2, 480, window.innerWidth - 40),
        h: clamp(s.h + (e.clientY - s.y) * 2, 360, window.innerHeight - 40),
      });
    };
    const up = () => setResizing(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [resizing]);

  if (!open) return null;

  const collapsible = view === "accordion";
  const isOpen = (t: string) => !collapsible || openSet.has(t);
  const toggleSection = (t: string) =>
    setOpenSet((s) => {
      const n = new Set(s);
      n.has(t) ? n.delete(t) : n.add(t);
      return n;
    });

  const matchCount = applyFilters(MOCK_CONVERSATIONS, filters).length;
  const byId: Record<string, Condition> = Object.fromEntries(filters.conditions.map((c) => [c.id, c]));
  const idOf = (field: ConditionField, key?: string) => (key ? `${field}:${key}` : field);
  const cond = (field: ConditionField, key?: string) => byId[idOf(field, key)];

  // Lazy upsert helpers — create the condition on first interaction, then mutate.
  const ensure = (field: ConditionField, key?: string, vtype?: FieldDef["type"]) =>
    dispatch({ type: "ADD_CONDITION", field, key, vtype });
  const setText = (field: ConditionField, value: string, key?: string) => {
    ensure(field, key);
    dispatch({ type: "UPDATE_CONDITION", id: idOf(field, key), patch: { text: value } });
  };
  const setNum = (field: ConditionField, num: Condition["num"]) => {
    ensure(field);
    dispatch({ type: "UPDATE_CONDITION", id: idOf(field), patch: { num } });
  };
  const toggleValue = (field: ConditionField, value: string) => {
    ensure(field);
    dispatch({ type: "TOGGLE_VALUE", id: idOf(field), value });
  };

  const agents = cond("agent")?.agents ?? {};
  const selectedAgents = Object.keys(agents);
  const postCallFields = dedupe(selectedAgents.flatMap((a) => agentDef(a)?.postCall ?? []));
  const pcConds = filters.conditions.filter((c) => c.field === "postCall");
  const ctxConds = filters.conditions.filter((c) => c.field === "context");
  const channelVals = cond("channel")?.values ?? [];

  const cnt = (...fields: ConditionField[]) =>
    filters.conditions.filter((c) => fields.includes(c.field) && conditionIsActive(c)).length;
  const sectionProps = (title: string, count: number) => ({
    title,
    icon: SECTION_ICON[title],
    count,
    collapsible,
    open: isOpen(title),
    onToggle: () => toggleSection(title),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        style={{ width: size.w, height: size.h, maxWidth: "95vw", maxHeight: "92vh" }}
        className="relative flex flex-col overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-8 py-4">
          <h2 className="text-base font-semibold text-text">Filters</h2>
          <div className="flex items-center gap-3">
            {/* view toggle (for testing layouts) */}
            <div className="flex items-center rounded-lg border border-border-strong bg-surface-2 p-0.5 text-xs">
              {(["accordion", "flat"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                    view === v ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 divide-y divide-border overflow-y-auto scroll-thin">
          {/* Type — icon choice cards */}
          <Section {...sectionProps("Type", cnt("channel"))}>
            <div className="flex flex-wrap gap-2">
              {TYPE_CARDS.map((c) => {
                const on = channelVals.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleValue("channel", c.value)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                      on ? "border-text bg-surface-2 text-text" : "border-border-strong text-text-dim hover:border-text-dim hover:text-text"
                    }`}
                  >
                    {c.icon}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Agent — searchable token select */}
          <Section {...sectionProps("Agent", cnt("agent"))}>
            <AgentField agents={agents} dispatch={dispatch} ensure={ensure} />
          </Section>

          {/* Outcome & status — check chips */}
          <Section {...sectionProps("Outcome & status", cnt("outcome", "callStatus", "endReason"))}>
            <Labeled label="Outcome">
              <TokenMultiSelect
                placeholder="Select outcomes…"
                options={OUTCOMES.map((o) => ({ value: o, label: o, dot: OUTCOME_DOT[o], count: CNT.outcome[o] }))}
                selected={cond("outcome")?.values ?? []}
                onToggle={(v) => toggleValue("outcome", v)}
              />
            </Labeled>
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <Labeled label="Call status">
                <MultiSelect layout="chips" options={CALL_STATUSES.map((s) => ({ value: s, label: s, dot: STATUS_DOT[s], count: CNT.callStatus[s] }))} selected={cond("callStatus")?.values ?? []} onToggle={(v) => toggleValue("callStatus", v)} />
              </Labeled>
              <Labeled label="End reason">
                <MultiSelect layout="chips" options={END_REASONS.map((e) => ({ value: e, label: e, count: CNT.endReason[e] }))} selected={cond("endReason")?.values ?? []} onToggle={(v) => toggleValue("endReason", v)} />
              </Labeled>
            </div>
          </Section>

          {/* Metrics */}
          <Section {...sectionProps("Metrics", cnt("duration", "turns", "turnLatency", "attempt"))}>
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <Labeled label="Call duration">
                <RangeSlider min={RANGE.duration.min} max={RANGE.duration.max} step={RANGE.duration.step} unit={RANGE.duration.unit} value={cond("duration")?.num ?? null} onChange={(num) => setNum("duration", num)} />
              </Labeled>
              <Labeled label="Turns">
                <RangeSlider min={RANGE.turns.min} max={RANGE.turns.max} step={RANGE.turns.step} value={cond("turns")?.num ?? null} onChange={(num) => setNum("turns", num)} />
              </Labeled>
              <Labeled label="Turn latency" className="self-end">
                <RangeSlider min={RANGE.turnLatency.min} max={RANGE.turnLatency.max} step={RANGE.turnLatency.step} unit={RANGE.turnLatency.unit} value={cond("turnLatency")?.num ?? null} onChange={(num) => setNum("turnLatency", num)} />
              </Labeled>
              <Labeled label="Attempt" className="self-end">
                <PillGroup value={cond("attempt")?.num ?? null} onChange={(num) => setNum("attempt", num ?? { op: "=", value: null, value2: null })} />
              </Labeled>
            </div>
          </Section>

          {/* Identity */}
          <Section {...sectionProps("Identity", cnt("from", "to", "campaign", "task"))}>
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              <TextField label="Caller (from)" value={cond("from")?.text ?? ""} onChange={(v) => setText("from", v)} />
              <TextField label="Callee (to)" value={cond("to")?.text ?? ""} onChange={(v) => setText("to", v)} />
              <TextField label="Campaign ID" value={cond("campaign")?.text ?? ""} onChange={(v) => setText("campaign", v)} />
              <TextField label="Task ID" value={cond("task")?.text ?? ""} onChange={(v) => setText("task", v)} />
            </div>
          </Section>

          {/* Post-call analysis — search-to-add (agent-gated) */}
          <Section {...sectionProps("Post-call analysis", pcConds.filter(conditionIsActive).length)}>
            <DynamicGroup group="postCall" gated={!selectedAgents.length} fields={postCallFields} conditions={pcConds} dispatch={dispatch} />
          </Section>
          <Section {...sectionProps("Context variables", ctxConds.filter(conditionIsActive).length)}>
            <ContextKeyInput conditions={ctxConds} dispatch={dispatch} />
          </Section>
        </div>

        {/* resize handle */}
        <button
          type="button"
          aria-label="Resize"
          onPointerDown={(e) => {
            e.preventDefault();
            resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
            setResizing(true);
          }}
          className="absolute bottom-1 right-1 flex h-5 w-5 cursor-nwse-resize items-center justify-center text-text-muted hover:text-text"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M11 5L5 11M11 9L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <footer className="flex items-center justify-between gap-2 border-t border-border px-8 py-4">
          <span className="text-sm text-text-dim">
            <span className="tabular-nums text-text">{matchCount}</span> of <span className="tabular-nums">{total}</span> conversations match
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => dispatch({ type: "CLEAR_CONDITIONS" })} className="rounded-lg px-3 py-2 text-sm text-text-dim hover:bg-surface-2 hover:text-text">
              Clear all
            </button>
            <button type="button" onClick={onClose} className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-black hover:bg-white/90">
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Section({
  title,
  icon,
  count = 0,
  collapsible,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  collapsible: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const Header = (
    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-dim">
      {icon && <span className="text-text-muted">{icon}</span>}
      {title}
      {count > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </span>
  );

  if (!collapsible) {
    return (
      <section className="space-y-5 px-8 py-6">
        {Header}
        {children}
      </section>
    );
  }
  return (
    <section>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-8 py-4 text-left hover:bg-surface-2/40">
        {Header}
        <ChevronDown size={15} className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-5 px-8 pb-6">{children}</div>}
    </section>
  );
}

function Labeled({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5${className ? ` ${className}` : ""}`}>
      <span className="block text-sm text-text-dim">{label}</span>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-text-muted">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="contains…" className="h-9 w-full rounded-lg border border-border-strong bg-surface-2 px-2.5 text-sm text-text outline-none placeholder:text-text-muted" />
    </label>
  );
}

function dedupe(fields: FieldDef[]): FieldDef[] {
  const seen = new Set<string>();
  return fields.filter((f) => (seen.has(f.key) ? false : (seen.add(f.key), true)));
}

// ---------------------------------------------------------------------------
// Agent — searchable, selected shown as removable chips + version sub-picker
// ---------------------------------------------------------------------------

export function AgentField({
  agents,
  dispatch,
  ensure,
}: {
  agents: Record<string, string[]>;
  dispatch: React.Dispatch<FilterAction>;
  ensure: (field: ConditionField) => void;
}) {
  const [q, setQ] = useState("");
  const selected = Object.keys(agents);
  const query = q.trim().toLowerCase();
  const available = AGENTS.filter((a) => !selected.includes(a.name) && a.name.toLowerCase().includes(query));
  const toggleAgent = (a: string) => {
    ensure("agent");
    dispatch({ type: "TOGGLE_AGENT", id: "agent", agent: a });
  };

  return (
    <div className="space-y-2.5">
      {/* search to add — always on top */}
      <div className="flex h-9 items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-2.5">
        <Search size={13} className="text-text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents…" className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted" />
      </div>
      {available.length > 0 && (q || selected.length === 0) && (
        <ul className="max-h-40 overflow-auto rounded-md border border-border scroll-thin">
          {available.map((a) => (
            <li key={a.name}>
              <button type="button" onClick={() => toggleAgent(a.name)} className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-surface-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Plus size={12} className="shrink-0 text-text-muted" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-text-dim">{a.name}</span>
                    <span className="block truncate font-mono text-[10px] text-text-muted">{a.id}</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs text-text-muted">{CNT.agent[a.name] ?? 0}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* selected agents with versions */}
      {selected.length > 0 && (
        <div className="space-y-2">
          {selected.map((name) => {
            const def = agentDef(name);
            const picked = agents[name] ?? [];
            return (
              <div key={name} className="rounded-lg border border-border bg-surface-2/40 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="break-words text-sm text-text">{name}</div>
                    <div className="truncate font-mono text-[11px] text-text-muted">{def?.id}</div>
                  </div>
                  <button type="button" onClick={() => toggleAgent(name)} aria-label={`Remove ${name}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-muted hover:bg-border-strong hover:text-text">
                    <X size={13} />
                  </button>
                </div>
                {def && <VersionPicker name={name} versions={def.versions} picked={picked} dispatch={dispatch} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Interactive version picker — a checkbox list (name + id), search + Select all / Clear.
function VersionPicker({
  name,
  versions,
  picked,
  dispatch,
}: {
  name: string;
  versions: AgentVersion[];
  picked: string[];
  dispatch: React.Dispatch<FilterAction>;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = versions.filter((v) => v.name.toLowerCase().includes(query) || v.id.toLowerCase().includes(query));
  const toggle = (id: string) => dispatch({ type: "TOGGLE_AGENT_VERSION", id: "agent", agent: name, version: id });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-text-muted">
          Versions {picked.length > 0 && <span className="text-text-dim">· {picked.length} selected</span>}
        </span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => versions.forEach((v) => !picked.includes(v.id) && toggle(v.id))} className="text-[11px] text-text-dim hover:text-text">
            Select all
          </button>
          {picked.length > 0 && (
            <button type="button" onClick={() => picked.forEach(toggle)} className="text-[11px] text-text-muted hover:text-text">
              Clear
            </button>
          )}
        </div>
      </div>
      {versions.length > 5 && (
        <div className="flex h-8 items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-2.5">
          <Search size={12} className="text-text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter versions…" className="w-full bg-transparent text-xs text-text outline-none placeholder:text-text-muted" />
        </div>
      )}
      <ul className="max-h-44 overflow-auto rounded-md border border-border scroll-thin">
        {shown.length === 0 && <li className="px-2.5 py-1.5 text-[11px] text-text-muted">No versions match.</li>}
        {shown.map((v) => {
          const on = picked.includes(v.id);
          return (
            <li key={v.id}>
              <button type="button" onClick={() => toggle(v.id)} className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors ${on ? "bg-surface-2" : "hover:bg-surface-2/60"}`}>
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? "border-white bg-white text-black" : "border-border-strong"}`}>
                  {on && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text">{v.name}</span>
                  <span className="block truncate font-mono text-[10px] text-text-muted">{v.id}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post-call / context — search-to-add picker + typed condition rows
// ---------------------------------------------------------------------------

// Card chrome shared between the picker card and the added-editors card.
const CARD = "rounded-lg border border-border-strong bg-surface shadow-xl shadow-black/40";

export function DynamicGroup({
  group,
  gated,
  fields,
  conditions,
  dispatch,
}: {
  group: "postCall" | "context";
  gated: boolean;
  fields: FieldDef[];
  conditions: Condition[];
  dispatch: React.Dispatch<FilterAction>;
}) {
  const [q, setQ] = useState("");

  if (gated) {
    return (
      <div className="flex justify-end">
        <div className={`${CARD} flex w-[400px] flex-col`}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-medium text-text">
            {group === "postCall" ? <ClipboardList size={13} className="text-text-muted" /> : <Braces size={13} className="text-text-muted" />}
            {group === "postCall" ? "Post-call analysis" : "Context variables"}
          </div>
          <div className="m-3 flex items-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-2/40 px-3 py-2.5 text-xs text-text-muted">
            <Lock size={12} className="shrink-0" /> Select an agent to load these fields.
          </div>
        </div>
      </div>
    );
  }

  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  const added = new Set(conditions.map((c) => c.key));
  const query = q.trim().toLowerCase();
  // Show ALL matching fields; already-added ones render checked + greyed out (not removed from the list).
  const visible = fields.filter((f) => f.key.toLowerCase().includes(query));

  return (
    <div className="flex items-start justify-end gap-1">
      {/* left card — added editors (only when there are conditions) */}
      {conditions.length > 0 && (
        <div className={`${CARD} flex w-[300px] shrink-0 flex-col`}>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Added</span>
            <span className="text-[10px] tabular-nums text-text-muted">{conditions.length}</span>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 scroll-thin" style={{ maxHeight: 360 }}>
            {[...conditions].reverse().map((c) => (
              <div key={c.id} className="rounded-md border border-border bg-surface-2/30 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-text">{c.key}</span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "REMOVE_CONDITION", id: c.id })}
                    aria-label={`Remove ${c.key}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted hover:bg-border-strong hover:text-text"
                  >
                    <X size={11} />
                  </button>
                </div>
                <DynamicEditor cond={c} field={byKey[c.key ?? ""]} group={group} dispatch={dispatch} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* right card — field picker (compact fixed width) */}
      <div className={`${CARD} flex w-[400px] shrink-0 flex-col`}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-medium text-text">
          {group === "postCall" ? <ClipboardList size={13} className="text-text-muted" /> : <Braces size={13} className="text-text-muted" />}
          {group === "postCall" ? "Post-call analysis" : "Context variables"}
        </div>
        <div className="mx-3 mt-2 flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2.5">
          <Search size={13} className="text-text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Find a field… (${fields.length})`}
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
          />
        </div>
        {visible.length > 0 ? (
          <ul className="mt-2 max-h-[300px] overflow-auto px-2 pb-2 scroll-thin">
            {visible.map((f) => {
              const isAdded = added.has(f.key);
              const existing = conditions.find((c) => c.key === f.key);
              return (
                <li key={f.key}>
                  <button
                    type="button"
                    onClick={() =>
                      isAdded && existing
                        ? dispatch({ type: "REMOVE_CONDITION", id: existing.id })
                        : dispatch({ type: "ADD_CONDITION", field: group, key: f.key, vtype: f.type })
                    }
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      isAdded ? "bg-surface-2 text-text" : "text-text-dim hover:bg-surface-2/60 hover:text-text"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          isAdded ? "border-white bg-white text-black" : "border-border-strong"
                        }`}
                      >
                        {isAdded && <Check size={11} strokeWidth={3} />}
                      </span>
                      <span className="truncate">{f.key}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 px-3 pb-3 text-xs text-text-muted">No fields match.</p>
        )}
      </div>
    </div>
  );
}

// Context variables are free-form keys — type the exact key, then configure on the right.
export function ContextKeyInput({ conditions, dispatch }: { conditions: Condition[]; dispatch: React.Dispatch<FilterAction> }) {
  const [key, setKey] = useState("");
  const trimmed = key.trim();
  const duplicate = !!trimmed && conditions.some((c) => c.key === trimmed);
  const canAdd = !!trimmed && !duplicate;
  const add = () => {
    if (!canAdd) return;
    dispatch({ type: "ADD_CONDITION", field: "context", key: trimmed, vtype: "string" });
    setKey("");
  };
  return (
    <div className="flex items-start justify-end gap-1">
      {/* left card — added editors */}
      {conditions.length > 0 && (
        <div className={`${CARD} flex w-[300px] shrink-0 flex-col`}>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Added</span>
            <span className="text-[10px] tabular-nums text-text-muted">{conditions.length}</span>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2 scroll-thin" style={{ maxHeight: 360 }}>
            {[...conditions].reverse().map((c) => (
              <div key={c.id} className="rounded-md border border-border bg-surface-2/30 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium text-text">{c.key}</span>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "REMOVE_CONDITION", id: c.id })}
                    aria-label={`Remove ${c.key}`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted hover:bg-border-strong hover:text-text"
                  >
                    <X size={11} />
                  </button>
                </div>
                <DynamicEditor cond={c} field={undefined} group="context" dispatch={dispatch} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* right card — picker */}
      <div className={`${CARD} flex w-[400px] shrink-0 flex-col`}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-medium text-text">
          <Braces size={13} className="text-text-muted" /> Context variables
        </div>
        <div className="p-3">
          <div className="flex gap-2">
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Type a variable key…"
              className="h-9 min-w-0 flex-1 rounded-md border border-border-strong bg-surface-2 px-3 text-sm text-text outline-none placeholder:text-text-muted focus:border-white"
            />
            <button
              type="button"
              onClick={add}
              disabled={!canAdd}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border-strong px-3 text-sm text-text hover:bg-surface-2 disabled:opacity-40"
            >
              <Plus size={13} /> Add
            </button>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {duplicate ? `"${trimmed}" is already added.` : "Enter a variable key (e.g. order_id)."}
          </p>
        </div>
      </div>
    </div>
  );
}

function DynamicEditor({
  cond,
  field,
  group,
  dispatch,
}: {
  cond: Condition;
  field: FieldDef | undefined;
  group: "postCall" | "context";
  dispatch: React.Dispatch<FilterAction>;
}) {
  const id = cond.id;
  const mode = cond.mode ?? "text";
  const update = (patch: Partial<Condition>) => dispatch({ type: "UPDATE_CONDITION", id, patch });
  const setMode = (m: MatchMode) => update({ mode: m, values: [], num: { op: "between", value: null, value2: null }, text: "" });
  const specificOptions = field?.values ?? distinctValues(MOCK_CONVERSATIONS, group, cond.key ?? "");

  const op = cond.num?.op ?? "between";
  return (
    <div className="space-y-2.5">
      {/* row 1 — mode (and operator when numeric) */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={mode} onChange={(v) => setMode(v as MatchMode)} options={MODE_OPTS} />
        {mode === "number" && (
          <Select
            value={op}
            onChange={(o) => update({ num: { op: o as Operator, value: cond.num?.value ?? null, value2: cond.num?.value2 ?? null } })}
            options={NUM_OPS}
          />
        )}
      </div>

      {/* row 2 — value editor (always full-width) */}
      {mode === "text" && (
        <input
          value={cond.text ?? ""}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="contains…"
          className="h-9 w-full rounded-md border border-border-strong bg-surface-2 px-3 text-sm text-text outline-none placeholder:text-text-muted"
        />
      )}

      {mode === "specific" && (
        <MultiSelect
          layout="chips"
          options={specificOptions.map((v) => ({ value: v, label: v }))}
          selected={cond.values ?? []}
          onToggle={(v) => dispatch({ type: "TOGGLE_VALUE", id, value: v })}
        />
      )}

      {mode === "number" && op === "between" && (() => {
        const { min, max } = numericDomain(MOCK_CONVERSATIONS, group, cond.key ?? "");
        const step = Math.max(1, Math.round((max - min) / 100));
        return <RangeSlider min={min} max={max} step={step} value={cond.num ?? null} onChange={(num) => update({ num })} />;
      })()}

      {mode === "number" && op !== "between" && (
        <NumInput
          value={cond.num?.value ?? null}
          placeholder="value"
          onChange={(n) => update({ num: { op, value: n, value2: null } })}
        />
      )}

      {mode === "boolean" && (
        <div className="inline-flex items-center rounded-md border border-border-strong bg-surface-2 p-0.5">
          {[{ v: "", l: "Any" }, { v: "true", l: "Yes" }, { v: "false", l: "No" }].map((o) => {
            const on = (cond.text ?? "") === o.v;
            return (
              <button
                key={o.l}
                type="button"
                onClick={() => update({ text: o.v })}
                className={`h-7 rounded-md px-3 text-xs transition-colors ${
                  on ? "bg-white text-black shadow-sm" : "text-text-dim hover:text-text"
                }`}
              >
                {o.l}
              </button>
            );
          })}
        </div>
      )}

      {mode === "date" && <DateRange value={cond.text ?? ""} onChange={(t) => update({ text: t })} />}
    </div>
  );
}

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="relative inline-block">
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-9 appearance-none rounded-md border border-border-strong bg-surface-2 pl-3 pr-7 text-sm text-text outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted" />
    </div>
  );
}

function NumInput({ value, placeholder, onChange }: { value: number | null; placeholder: string; onChange: (n: number | null) => void }) {
  return (
    <input type="number" value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className="h-9 w-24 rounded-md border border-border-strong bg-surface-2 px-2.5 text-sm text-text outline-none placeholder:text-text-muted" />
  );
}

function DateRange({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [from, to] = value.split("|");
  const hasRange = !!(from && to);
  const [expanded, setExpanded] = useState(!hasRange);
  const prevHadRange = useRef(hasRange);

  // Auto-collapse the calendar once a complete range is picked (both ends).
  useEffect(() => {
    if (hasRange && !prevHadRange.current) setExpanded(false);
    prevHadRange.current = hasRange;
  }, [hasRange]);

  if (!expanded && hasRange) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface-2 px-3 py-2 text-sm text-text hover:border-text-dim"
      >
        <span className="flex items-center gap-2 truncate">
          <Calendar size={13} className="shrink-0 text-text-muted" />
          <span className="truncate">{from} <span className="text-text-muted">→</span> {to}</span>
        </span>
        <Pencil size={12} className="shrink-0 text-text-muted" />
      </button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-border bg-surface-2/30 p-3">
      <RangeCalendar from={from || null} to={to || null} onChange={(f, t) => onChange(`${f}|${t}`)} />
    </div>
  );
}
