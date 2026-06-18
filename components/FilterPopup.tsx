"use client";

import { useEffect, useRef, useState } from "react";
import { X, Search, Plus, ChevronDown, Lock, Globe, PhoneIncoming, PhoneOutgoing, Phone, Bot, Flag, Activity, Fingerprint, ClipboardList, Braces } from "lucide-react";
import { MultiSelect } from "./MultiSelect";
import { TokenMultiSelect } from "./TokenMultiSelect";
import { RangeSlider } from "./RangeSlider";
import { PillGroup } from "./PillGroup";
import { AGENTS, agentDef, MOCK_CONVERSATIONS } from "@/lib/mockConversations";
import { OUTCOME_DOT, STATUS_DOT, countBy, distinctValues } from "@/lib/display";
import { applyFilters, conditionIsActive } from "@/lib/filters";
import {
  CALL_STATUSES,
  END_REASONS,
  OUTCOMES,
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

const CNT = {
  outcome: countBy(MOCK_CONVERSATIONS, (c) => c.outcome),
  callStatus: countBy(MOCK_CONVERSATIONS, (c) => c.callInfo.status),
  endReason: countBy(MOCK_CONVERSATIONS, (c) => c.callInfo.endReason),
  agent: countBy(MOCK_CONVERSATIONS, (c) => c.agent),
};

const TYPE_CARDS = [
  { value: "web", label: "Web", icon: <Globe size={18} /> },
  { value: "inbound", label: "Inbound", icon: <PhoneIncoming size={18} /> },
  { value: "outbound", label: "Outbound", icon: <PhoneOutgoing size={18} /> },
];

const RANGE = {
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
            <div className="grid grid-cols-3 gap-3">
              {TYPE_CARDS.map((c) => {
                const on = channelVals.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleValue("channel", c.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border py-4 text-sm transition-colors ${
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
              <Labeled label="Turn latency">
                <RangeSlider min={RANGE.turnLatency.min} max={RANGE.turnLatency.max} step={RANGE.turnLatency.step} unit={RANGE.turnLatency.unit} value={cond("turnLatency")?.num ?? null} onChange={(num) => setNum("turnLatency", num)} />
              </Labeled>
              <Labeled label="Attempt">
                <PillGroup value={cond("attempt")?.num ?? null} onChange={(num) => setNum("attempt", num ?? { op: "=", value: null, value2: null })} />
              </Labeled>
            </div>
          </Section>

          {/* Identity */}
          <Section {...sectionProps("Identity", cnt("from", "to", "campaign", "task"))}>
            <div className="grid grid-cols-2 gap-3">
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

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm text-text-dim">{label}</span>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-text-muted">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="contains…" className="h-9 w-full rounded-md border border-border-strong bg-surface-2 px-2.5 text-sm text-text outline-none placeholder:text-text-muted" />
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

function AgentField({
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
      {/* selected chips with versions */}
      {selected.length > 0 && (
        <div className="space-y-2">
          {selected.map((name) => {
            const def = agentDef(name);
            const picked = agents[name] ?? [];
            return (
              <div key={name} className="rounded-lg border border-border bg-surface-2/40 p-2.5">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <span className="break-words text-sm text-text">{name}</span>
                  <button type="button" onClick={() => toggleAgent(name)} aria-label={`Remove ${name}`} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted hover:bg-border-strong hover:text-text">
                    <X size={13} />
                  </button>
                </div>
                {def && <VersionPicker name={name} versions={def.versions} picked={picked} dispatch={dispatch} />}
              </div>
            );
          })}
        </div>
      )}

      {/* search to add */}
      <div className="flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2.5">
        <Search size={13} className="text-text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agents…" className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted" />
      </div>
      {available.length > 0 && (q || selected.length === 0) && (
        <ul className="max-h-40 overflow-auto rounded-md border border-border scroll-thin">
          {available.map((a) => (
            <li key={a.name}>
              <button type="button" onClick={() => toggleAgent(a.name)} className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-text-dim hover:bg-surface-2 hover:text-text">
                <span className="flex items-center gap-2 truncate">
                  <Plus size={12} className="shrink-0 text-text-muted" />
                  {a.name}
                </span>
                <span className="shrink-0 text-xs text-text-muted">{CNT.agent[a.name] ?? 0}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Interactive version picker — search + Select all / Clear + live count.
function VersionPicker({
  name,
  versions,
  picked,
  dispatch,
}: {
  name: string;
  versions: string[];
  picked: string[];
  dispatch: React.Dispatch<FilterAction>;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = versions.filter((v) => v.toLowerCase().includes(query));
  const toggle = (v: string) => dispatch({ type: "TOGGLE_AGENT_VERSION", id: "agent", agent: name, version: v });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {versions.length > 5 && (
          <div className="flex h-8 flex-1 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2.5">
            <Search size={12} className="text-text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter versions…" className="w-full bg-transparent text-xs text-text outline-none placeholder:text-text-muted" />
          </div>
        )}
        <button type="button" onClick={() => versions.forEach((v) => !picked.includes(v) && toggle(v))} className="rounded-md border border-border-strong px-2 py-1 text-[11px] text-text-dim hover:bg-surface-2 hover:text-text">
          Select all
        </button>
        {picked.length > 0 && (
          <button type="button" onClick={() => picked.forEach(toggle)} className="rounded-md px-2 py-1 text-[11px] text-text-muted hover:text-text">
            Clear
          </button>
        )}
      </div>
      <div className="flex max-h-28 flex-wrap content-start gap-1.5 overflow-y-auto scroll-thin">
        {shown.map((v) => {
          const on = picked.includes(v);
          return (
            <button key={v} type="button" onClick={() => toggle(v)} className={`h-fit max-w-full break-all rounded border px-2 py-0.5 text-left font-mono text-xs transition-colors ${on ? "border-accent bg-accent/15 text-text" : "border-border-strong text-text-muted hover:text-text"}`}>
              {v}
            </button>
          );
        })}
        {!shown.length && <span className="text-[11px] text-text-muted">No versions match.</span>}
      </div>
      <div className="text-[11px] text-text-muted">{picked.length ? `${picked.length} of ${versions.length} selected` : "All versions"}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post-call / context — search-to-add picker + typed condition rows
// ---------------------------------------------------------------------------

function DynamicGroup({
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
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-2/40 px-3 py-2.5 text-xs text-text-muted">
        <Lock size={12} /> Select an agent to load these fields.
      </div>
    );
  }

  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
  const added = new Set(conditions.map((c) => c.key));
  const query = q.trim().toLowerCase();
  const available = fields.filter((f) => !added.has(f.key) && f.key.toLowerCase().includes(query));

  return (
    <div className="space-y-3">
      <div>
        <div className="flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2.5">
          <Search size={13} className="text-text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Find a field… (${fields.length})`} className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted" />
        </div>
        {available.length > 0 ? (
          <ul className="mt-1 max-h-44 overflow-auto rounded-md border border-border scroll-thin">
            {available.map((f) => (
              <li key={f.key}>
                <button type="button" onClick={() => dispatch({ type: "ADD_CONDITION", field: group, key: f.key, vtype: f.type })} className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-text-dim hover:bg-surface-2 hover:text-text">
                  <span className="flex items-center gap-2 truncate">
                    <Plus size={12} className="shrink-0 text-text-muted" />
                    {f.key}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-text-muted">{f.type}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 px-1 text-xs text-text-muted">{query ? "No fields match." : "All fields added."}</p>
        )}
      </div>

      {conditions.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          {conditions.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-surface-2/30 p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="truncate text-sm font-medium text-text">{c.key}</span>
                <button type="button" onClick={() => dispatch({ type: "REMOVE_CONDITION", id: c.id })} aria-label={`Remove ${c.key}`} className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-border-strong hover:text-text">
                  <X size={14} />
                </button>
              </div>
              <DynamicEditor cond={c} field={byKey[c.key ?? ""]} group={group} dispatch={dispatch} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Context variables are free-form keys — type the exact key, then configure on the right.
function ContextKeyInput({ conditions, dispatch }: { conditions: Condition[]; dispatch: React.Dispatch<FilterAction> }) {
  const [key, setKey] = useState("");
  const add = () => {
    const k = key.trim();
    if (!k || conditions.some((c) => c.key === k)) return;
    dispatch({ type: "ADD_CONDITION", field: "context", key: k, vtype: "string" });
    setKey("");
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Type a variable key…"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-2 px-3 text-sm text-text outline-none placeholder:text-text-muted focus:border-white"
        />
        <button type="button" onClick={add} disabled={!key.trim()} className="flex h-9 items-center gap-1.5 rounded-lg border border-border-strong px-4 text-sm text-text hover:bg-surface-2 disabled:opacity-40">
          <Plus size={13} /> Add
        </button>
      </div>
      <p className="text-xs text-text-muted">Enter the exact variable key (e.g. order_id). Type and value follow on the right.</p>
      {conditions.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          {conditions.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-surface-2/30 p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="truncate text-sm font-medium text-text">{c.key}</span>
                <button type="button" onClick={() => dispatch({ type: "REMOVE_CONDITION", id: c.id })} aria-label={`Remove ${c.key}`} className="flex h-6 w-6 items-center justify-center rounded text-text-muted hover:bg-border-strong hover:text-text">
                  <X size={14} />
                </button>
              </div>
              <DynamicEditor cond={c} field={undefined} group="context" dispatch={dispatch} />
            </div>
          ))}
        </div>
      )}
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={mode} onChange={(v) => setMode(v as MatchMode)} options={MODE_OPTS} />

      {mode === "text" && (
        <>
          <span className="text-sm text-text-muted">contains</span>
          <input value={cond.text ?? ""} onChange={(e) => update({ text: e.target.value })} placeholder="value…" className="h-9 min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-2 px-3 text-sm text-text outline-none placeholder:text-text-muted" />
        </>
      )}

      {mode === "specific" && (
        <>
          <span className="text-sm text-text-muted">is any of</span>
          <div className="w-full">
            <MultiSelect layout="chips" options={specificOptions.map((v) => ({ value: v, label: v }))} selected={cond.values ?? []} onToggle={(v) => dispatch({ type: "TOGGLE_VALUE", id, value: v })} />
          </div>
        </>
      )}

      {mode === "number" && (
        <>
          <Select value={cond.num?.op ?? "between"} onChange={(op) => update({ num: { op: op as Operator, value: cond.num?.value ?? null, value2: cond.num?.value2 ?? null } })} options={NUM_OPS} />
          <NumInput value={cond.num?.value ?? null} placeholder={cond.num?.op === "between" ? "min" : "value"} onChange={(n) => update({ num: { op: cond.num?.op ?? "between", value: n, value2: cond.num?.value2 ?? null } })} />
          {(cond.num?.op ?? "between") === "between" && (
            <>
              <span className="text-text-muted">—</span>
              <NumInput value={cond.num?.value2 ?? null} placeholder="max" onChange={(n) => update({ num: { op: "between", value: cond.num?.value ?? null, value2: n } })} />
            </>
          )}
        </>
      )}

      {mode === "boolean" && (
        <>
          <span className="text-sm text-text-muted">is</span>
          {[{ v: "", l: "Any" }, { v: "true", l: "Yes" }, { v: "false", l: "No" }].map((o) => {
            const on = (cond.text ?? "") === o.v;
            return (
              <button key={o.l} type="button" onClick={() => update({ text: o.v })} className={`h-8 rounded-lg border px-3 text-sm ${on ? "border-text bg-text text-bg" : "border-border-strong text-text-dim hover:text-text"}`}>
                {o.l}
              </button>
            );
          })}
        </>
      )}

      {mode === "date" && <DateRange value={cond.text ?? ""} onChange={(t) => update({ text: t })} />}
    </div>
  );
}

function Select<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-9 appearance-none rounded-lg border border-border-strong bg-surface-2 pl-3 pr-7 text-sm text-text outline-none">
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
    <input type="number" value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className="h-9 w-24 rounded-lg border border-border-strong bg-surface-2 px-2.5 text-sm text-text outline-none placeholder:text-text-muted" />
  );
}

function DateRange({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [from, to] = value.split("|");
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-muted">between</span>
      <input type="date" value={from || ""} onChange={(e) => onChange(`${e.target.value}|${to || ""}`)} className="h-9 rounded-lg border border-border-strong bg-surface-2 px-2.5 text-sm text-text outline-none [color-scheme:dark]" />
      <span className="text-text-muted">—</span>
      <input type="date" value={to || ""} onChange={(e) => onChange(`${from || ""}|${e.target.value}`)} className="h-9 rounded-lg border border-border-strong bg-surface-2 px-2.5 text-sm text-text outline-none [color-scheme:dark]" />
    </div>
  );
}
