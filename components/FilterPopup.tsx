"use client";

import { useEffect, useRef, useState } from "react";
import { X, Search, Lock, GripVertical, Globe, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { MultiSelect } from "./MultiSelect";
import { RangeSlider } from "./RangeSlider";
import { PillGroup } from "./PillGroup";
import { AGENTS, agentDef, MOCK_CONVERSATIONS } from "@/lib/mockConversations";
import { OUTCOME_DOT, STATUS_DOT, countBy, histogram } from "@/lib/display";
import {
  CALL_STATUSES,
  END_REASONS,
  OUTCOMES,
  type Condition,
  type ConditionField,
  type FilterState,
  type NumericFilter,
} from "@/lib/types";
import type { FilterAction } from "@/lib/useFilters";

interface FilterPopupProps {
  close: () => void;
  filters: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  matchCount: number;
  total: number;
}

const TYPE_OPTIONS = [
  { value: "web", label: "Web", icon: <Globe size={14} />, hint: "Web widget session — no phone call." },
  { value: "inbound", label: "Inbound", icon: <PhoneIncoming size={14} />, hint: "Inbound call — the contact called the agent." },
  { value: "outbound", label: "Outbound", icon: <PhoneOutgoing size={14} />, hint: "Outbound call — the agent called the contact." },
];

// Hover-detail hints for the enum chips.
const OUTCOME_HINT: Record<string, string> = {
  connected: "The contact was reached and engaged.",
  resolved: "The query was resolved during the session.",
  not_interested: "The contact declined or opted out.",
  meeting_booked: "A follow-up meeting was scheduled.",
  no_response: "No answer or reply from the contact.",
  unknown: "Outcome could not be determined.",
};
const STATUS_HINT: Record<string, string> = {
  completed: "Call connected and finished normally.",
  failed: "Call failed to connect.",
  busy: "The line was busy.",
  no_answer: "The contact did not pick up.",
  in_progress: "Call is still active.",
};
const END_REASON_HINT: Record<string, string> = {
  completed: "Conversation ended normally.",
  caller_hangup: "The contact hung up.",
  agent_hangup: "The agent ended the call.",
  no_answer: "No answer before timeout.",
  voicemail: "The call reached voicemail.",
};

const CNT = {
  outcome: countBy(MOCK_CONVERSATIONS, (c) => c.outcome),
  callStatus: countBy(MOCK_CONVERSATIONS, (c) => c.callInfo.status),
  endReason: countBy(MOCK_CONVERSATIONS, (c) => c.callInfo.endReason),
  agent: countBy(MOCK_CONVERSATIONS, (c) => c.agent),
};

// Default slider bounds for the open-ended metrics (user can narrow from here).
const RANGE_DEFAULTS = {
  duration: { min: 0, max: 600, step: 5 },
  turns: { min: 0, max: 50, step: 1 },
  turnLatency: { min: 0, max: 2000, step: 10 },
};

// Data distributions rendered behind each slider.
const HIST = {
  duration: histogram(MOCK_CONVERSATIONS, (c) => c.duration, RANGE_DEFAULTS.duration.min, RANGE_DEFAULTS.duration.max),
  turns: histogram(MOCK_CONVERSATIONS, (c) => c.stats.turns, RANGE_DEFAULTS.turns.min, RANGE_DEFAULTS.turns.max),
  turnLatency: histogram(MOCK_CONVERSATIONS, (c) => c.stats.latency.turn.avg, RANGE_DEFAULTS.turnLatency.min, RANGE_DEFAULTS.turnLatency.max),
};

// Section → keywords for the top search box (Layout A has no catalog to search,
// so search filters which sections are shown).
const SECTION_KEYWORDS: Record<string, string> = {
  Agent: "agent version",
  Type: "type web call inbound outbound direction channel",
  "Outcome & status": "outcome status call end reason resolved connected",
  Metrics: "metrics call duration turns turn latency attempt",
  Identity: "identity caller from callee to campaign task id provider",
  "Post call analysis": "post call analysis sentiment promise objection",
  "Context variables": "context variables due amount customer language region",
};

export function FilterPopup({ close, filters, dispatch, matchCount, total }: FilterPopupProps) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const [agentQuery, setAgentQuery] = useState("");

  // Draggable panel — move by its header grip
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function onDragStart(e: React.PointerEvent) {
    dragStart.current = {
      sx: e.clientX,
      sy: e.clientY,
      ox: pos?.x ?? 0,
      oy: pos?.y ?? 0,
    };
    setDragging(true);
  }

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const s = dragStart.current;
      if (!s) return;
      setPos({ x: s.ox + (e.clientX - s.sx), y: s.oy + (e.clientY - s.sy) });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);
  const sectionVisible = (title: string) =>
    !q || (SECTION_KEYWORDS[title] ?? title.toLowerCase()).includes(q);

  // Condition lookup + lazy upsert helpers --------------------------------
  const byId: Record<string, Condition> = Object.fromEntries(
    filters.conditions.map((c) => [c.id, c])
  );
  const idOf = (field: ConditionField, key?: string) => (key ? `${field}:${key}` : field);
  const cond = (field: ConditionField, key?: string) => byId[idOf(field, key)];

  const ensure = (field: ConditionField, key?: string) =>
    dispatch({ type: "ADD_CONDITION", field, key });

  const setText = (field: ConditionField, value: string, key?: string) => {
    ensure(field, key);
    dispatch({ type: "UPDATE_CONDITION", id: idOf(field, key), patch: { text: value } });
  };
  const setNum = (field: ConditionField, num: NumericFilter) => {
    ensure(field);
    dispatch({ type: "UPDATE_CONDITION", id: idOf(field), patch: { num } });
  };
  const toggleValue = (field: ConditionField, value: string) => {
    ensure(field);
    dispatch({ type: "TOGGLE_VALUE", id: idOf(field), value });
  };
  const toggleAgent = (agent: string) => {
    ensure("agent");
    dispatch({ type: "TOGGLE_AGENT", id: "agent", agent });
  };
  const toggleAgentVersion = (agent: string, version: string) => {
    ensure("agent");
    dispatch({ type: "TOGGLE_AGENT_VERSION", id: "agent", agent, version });
  };

  // Agent gating for dynamic sections
  const agents = cond("agent")?.agents ?? {};
  const selectedAgents = Object.keys(agents);
  const postCallKeys = Array.from(
    new Set(selectedAgents.flatMap((a) => agentDef(a)?.postCall ?? []))
  );
  const contextKeys = Array.from(
    new Set(selectedAgents.flatMap((a) => agentDef(a)?.context ?? []))
  );

  return (
    <div
      role="dialog"
      aria-label="Filters"
      style={pos ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined}
      className="absolute right-0 top-full z-40 mt-2 flex max-h-[78vh] w-[480px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border-strong bg-surface shadow-2xl shadow-black/50"
    >
      {/* header — drag handle */}
      <header
        onPointerDown={onDragStart}
        className={`flex select-none items-start justify-between border-b border-border px-5 py-4 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div className="flex items-start gap-2">
          <GripVertical size={15} className="mt-0.5 shrink-0 text-text-muted" />
          <div>
            <h2 className="text-sm font-semibold text-text">Filters</h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Set any of the conditions below to narrow the set.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Close filters"
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <X size={16} />
        </button>
      </header>

      {/* search */}
      <div className="border-b border-border px-5 py-3">
        <div className="flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2.5">
          <Search size={13} className="text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search filters…"
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* body — single scroll of sections */}
      <div className="flex-1 divide-y divide-border overflow-y-auto scroll-thin">
        {sectionVisible("Agent") && (
          <Section title="Agent">
            <Field label="Agent & version">
              <div className="mb-2 flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2.5">
                <Search size={13} className="text-text-muted" />
                <input
                  value={agentQuery}
                  onChange={(e) => setAgentQuery(e.target.value)}
                  placeholder="Search agents…"
                  className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
                />
              </div>
              <MultiSelect
                options={AGENTS.filter((a) =>
                  a.name.toLowerCase().includes(agentQuery.trim().toLowerCase())
                ).map((a) => ({ value: a.name, label: a.name, count: CNT.agent[a.name] }))}
                selected={selectedAgents}
                onToggle={toggleAgent}
                emptyHint="No agents match."
                renderExtra={(name, isSel) => {
                  if (!isSel) return null;
                  const def = agentDef(name);
                  if (!def) return null;
                  const picked = agents[name] ?? [];
                  return (
                    <div className="flex flex-wrap gap-1.5 px-9 pb-2 pt-0.5">
                      {def.versions.map((v) => {
                        const on = picked.includes(v);
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => toggleAgentVersion(name, v)}
                            className={`rounded border px-1.5 py-0.5 text-xs ${
                              on ? "border-accent bg-accent/15 text-text" : "border-border-strong text-text-muted hover:text-text"
                            }`}
                          >
                            {v}
                          </button>
                        );
                      })}
                      {!picked.length && <span className="self-center text-[11px] text-text-muted">all versions</span>}
                    </div>
                  );
                }}
              />
            </Field>
          </Section>
        )}

        {sectionVisible("Type") && (
          <Section title="Type">
            <MultiSelect
              layout="chips"
              options={TYPE_OPTIONS}
              selected={cond("channel")?.values ?? []}
              onToggle={(v) => toggleValue("channel", v)}
            />
          </Section>
        )}

        {sectionVisible("Outcome & status") && (
          <Section title="Outcome & status">
            <Field label="Outcome">
              <MultiSelect
                layout="chips"
                options={OUTCOMES.map((o) => ({ value: o, label: o, dot: OUTCOME_DOT[o], count: CNT.outcome[o], hint: OUTCOME_HINT[o] }))}
                selected={cond("outcome")?.values ?? []}
                onToggle={(v) => toggleValue("outcome", v)}
              />
            </Field>
            <Field label="Call status">
              <MultiSelect
                layout="chips"
                options={CALL_STATUSES.map((s) => ({ value: s, label: s, dot: STATUS_DOT[s], count: CNT.callStatus[s], hint: STATUS_HINT[s] }))}
                selected={cond("callStatus")?.values ?? []}
                onToggle={(v) => toggleValue("callStatus", v)}
              />
            </Field>
            <Field label="End reason">
              <MultiSelect
                layout="chips"
                options={END_REASONS.map((e) => ({ value: e, label: e, count: CNT.endReason[e], hint: END_REASON_HINT[e] }))}
                selected={cond("endReason")?.values ?? []}
                onToggle={(v) => toggleValue("endReason", v)}
              />
            </Field>
          </Section>
        )}

        {sectionVisible("Metrics") && (
          <Section title="Metrics">
            <Field label="Call duration">
              <RangeSlider
                unit="s"
                min={RANGE_DEFAULTS.duration.min}
                max={RANGE_DEFAULTS.duration.max}
                step={RANGE_DEFAULTS.duration.step}
                histogram={HIST.duration}
                value={cond("duration")?.num ?? null}
                onChange={(num) => setNum("duration", num)}
              />
            </Field>
            <Field label="Turns">
              <RangeSlider
                min={RANGE_DEFAULTS.turns.min}
                max={RANGE_DEFAULTS.turns.max}
                step={RANGE_DEFAULTS.turns.step}
                histogram={HIST.turns}
                value={cond("turns")?.num ?? null}
                onChange={(num) => setNum("turns", num)}
              />
            </Field>
            <Field label="Turn latency">
              <RangeSlider
                unit="ms"
                min={RANGE_DEFAULTS.turnLatency.min}
                max={RANGE_DEFAULTS.turnLatency.max}
                step={RANGE_DEFAULTS.turnLatency.step}
                histogram={HIST.turnLatency}
                value={cond("turnLatency")?.num ?? null}
                onChange={(num) => setNum("turnLatency", num)}
              />
            </Field>
            <Field label="Attempt">
              <PillGroup
                value={cond("attempt")?.num ?? null}
                onChange={(num) => setNum("attempt", num ?? { op: "=", value: null, value2: null })}
              />
            </Field>
          </Section>
        )}

        {sectionVisible("Identity") && (
          <Section title="Identity">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Caller (from)" value={cond("from")?.text ?? ""} onChange={(v) => setText("from", v)} />
              <TextField label="Callee (to)" value={cond("to")?.text ?? ""} onChange={(v) => setText("to", v)} />
              <TextField label="Campaign ID" value={cond("campaign")?.text ?? ""} onChange={(v) => setText("campaign", v)} />
              <TextField label="Task ID" value={cond("task")?.text ?? ""} onChange={(v) => setText("task", v)} />
            </div>
          </Section>
        )}

        {/* Agent-gated sections — pinned to the bottom */}
        {sectionVisible("Post call analysis") && (
          <Section title="Post call analysis">
            <DynamicBlock
              gated={!selectedAgents.length}
              hintLabel="post call analysis"
              keys={postCallKeys}
              get={(k) => cond("postCall", k)?.text ?? ""}
              set={(k, v) => setText("postCall", v, k)}
            />
          </Section>
        )}
        {sectionVisible("Context variables") && (
          <Section title="Context variables">
            <DynamicBlock
              gated={!selectedAgents.length}
              hintLabel="context variables"
              keys={contextKeys}
              get={(k) => cond("context", k)?.text ?? ""}
              set={(k, v) => setText("context", v, k)}
            />
          </Section>
        )}
      </div>

      {/* footer */}
      <footer className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
        <span className="text-xs text-text-dim">
          <span className="tabular-nums text-text">{matchCount}</span> of{" "}
          <span className="tabular-nums">{total}</span> conversations match
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: "CLEAR_CONDITIONS" })}
            className="rounded-md px-3 py-2 text-sm text-text-dim hover:bg-surface-2 hover:text-text"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded-md bg-white px-5 py-2 text-sm font-medium text-black hover:bg-white/90"
          >
            Done
          </button>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 px-5 py-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm text-text-dim">{label}</span>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="contains…"
        className="h-9 w-full rounded-md border border-border-strong bg-surface-2 px-2.5 text-sm text-text outline-none placeholder:text-text-muted"
      />
    </label>
  );
}

function DynamicBlock({
  gated,
  hintLabel,
  keys,
  get,
  set,
}: {
  gated: boolean;
  hintLabel: string;
  keys: string[];
  get: (k: string) => string;
  set: (k: string, v: string) => void;
}) {
  if (gated) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-2/40 px-3 py-2.5 text-xs text-text-muted">
        <Lock size={12} /> Select an agent to populate {hintLabel}.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {keys.map((k) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs text-text-muted">{k}</span>
              <input
                value={get(k)}
                onChange={(e) => set(k, e.target.value)}
                placeholder="contains…"
                className="h-9 w-full rounded-md border border-border-strong bg-surface-2 px-2.5 text-sm text-text outline-none placeholder:text-text-muted"
              />
            </label>
          ))}
    </div>
  );
}
