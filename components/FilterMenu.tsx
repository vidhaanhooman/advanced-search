"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  Search,
  ChevronRight,
  Phone,
  Bot,
  Flag,
  PhoneOff,
  Timer,
  MessageSquare,
  Gauge,
  Repeat2,
  PhoneIncoming,
  PhoneOutgoing,
  ArrowLeftRight,
  Megaphone,
  Hash,
  ListChecks,
  ClipboardList,
  Braces,
  Pin,
  PinOff,
  Voicemail,
  Clock,
  Zap,
} from "lucide-react";
import { MultiSelect } from "./MultiSelect";
import { RangeSlider } from "./RangeSlider";
import { PillGroup } from "./PillGroup";
import { AgentPopout } from "./AgentPopout";
import {
  ContextKeyInput,
  DynamicGroup,
  TYPE_CARDS,
  DIRECTION_CARDS,
  RANGE,
  CNT,
} from "./FilterPopup";
import { OUTCOME_DOT } from "@/lib/display";
import { agentDef } from "@/lib/mockConversations";
import { conditionIsActive } from "@/lib/filters";
import {
  END_REASONS,
  OUTCOMES,
  type Condition,
  type ConditionField,
  type FieldDef,
  type FilterState,
  type NumericFilter,
} from "@/lib/types";
import type { FilterAction } from "@/lib/useFilters";

interface FilterMenuProps {
  filters: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  /** Open the full advanced filter modal. */
  onOpenAdvanced: () => void;
  /** Close the dropdown (e.g. after picking a leaf action). */
  close: () => void;
  /** Whether the dropdown is pinned open (disables outside-click + Escape close). */
  pinned?: boolean;
  /** Toggle the pinned state. */
  onTogglePin?: () => void;
}

type Ctx = {
  filters: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  cond: (field: ConditionField, key?: string) => Condition | undefined;
  ensure: (field: ConditionField, key?: string) => void;
  setText: (field: ConditionField, value: string, key?: string) => void;
  setNum: (field: ConditionField, num: NumericFilter) => void;
  toggleValue: (field: ConditionField, value: string) => void;
};

interface Cat {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Active-state predicate — drives the trailing dot. */
  active?: (ctx: Ctx) => boolean;
  /** Disabled-state predicate — greys out the row and blocks interaction. Receives an optional reason for the title. */
  disabled?: (ctx: Ctx) => { reason: string } | false;
  /** Submenu body. Omit for leaf actions. */
  render?: (ctx: Ctx, p: FilterMenuProps) => React.ReactNode;
  /** Leaf action (no submenu). */
  onSelect?: (ctx: Ctx, p: FilterMenuProps) => void;
  /** Narrower flyout for compact editors (e.g. a few pills). */
  narrow?: boolean;
  /** Wider flyout for two-pane editors. */
  wide?: boolean;
  /** Render flyout without the default padding + title (editor brings its own chrome). */
  bare?: boolean;
  /** Render flyout container with NO chrome at all (no border/bg/shadow/rounded) — editor is fully responsible. */
  unstyled?: boolean;
}

// Per-Type allow-lists — which menu rows stay enabled for each non-call Type value.
// "call" allows everything (no entry). When multiple Types are selected, the union
// of their allow-lists applies. Agent is allowed for every Type.
const TYPE_ALLOWED: Record<string, string[]> = {
  chat: ["agent", "turns", "context"],
  broadcast: ["agent", "to", "callSid", "campaign", "task", "outcome", "duration", "context"],
  web: ["agent", "duration", "turns", "turnLatency", "postCall", "context"],
};

const typeDisabled = (catId: string) => (ctx: Ctx) => {
  const vals = ctx.cond("channel")?.values ?? [];
  if (!vals.length || vals.includes("call")) return false as const;
  const allowed = new Set(vals.flatMap((v) => TYPE_ALLOWED[v] ?? []));
  if (allowed.has(catId)) return false as const;
  return { reason: "Not applicable for the selected Type." };
};

// Active helper: does the condition for this field/key carry a real value?
const isOn = (ctx: Ctx, field: ConditionField, key?: string) => {
  const c = ctx.cond(field, key);
  return !!c && conditionIsActive(c);
};

interface Section {
  /** Optional uppercase header label rendered above the group. */
  title?: string;
  items: Cat[];
}

// Quick-filter presets — each applies a pre-baked set of conditions in one click.
const QUICK_FILTERS: { id: string; label: string; icon: React.ReactNode; conditions: Condition[] }[] = [
  {
    id: "qf:connected-calls",
    label: "Connected calls",
    icon: <PhoneIncoming size={15} />,
    conditions: [
      { id: "channel", field: "channel", values: ["call"] },
      { id: "outcome", field: "outcome", values: ["connected"] },
    ],
  },
  {
    id: "qf:failed-calls",
    label: "Failed calls",
    icon: <PhoneOff size={15} />,
    conditions: [
      { id: "channel", field: "channel", values: ["call"] },
      { id: "callStatus", field: "callStatus", values: ["failed", "busy", "no_answer"] },
    ],
  },
  {
    id: "qf:voicemails",
    label: "Voicemails",
    icon: <Voicemail size={15} />,
    conditions: [{ id: "endReason", field: "endReason", values: ["voicemail"] }],
  },
  {
    id: "qf:long-calls",
    label: "Long calls (>3 min)",
    icon: <Clock size={15} />,
    conditions: [{ id: "duration", field: "duration", num: { op: "between", value: 180, value2: null } }],
  },
];

const SECTIONS: Section[] = [
  // — source —
  { items: [
    {
      id: "quickFilters",
      label: "Quick filters",
      icon: <Zap size={15} />,
      render: (_ctx, p) => (
        <div className="flex flex-col">
          {QUICK_FILTERS.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                p.dispatch({ type: "SET_CONDITIONS", conditions: q.conditions });
                p.close();
              }}
              className="flex w-full items-center gap-3 rounded-md px-2.5 py-1.5 text-left text-sm text-text-dim transition-colors hover:bg-surface-2/60 hover:text-text"
            >
              <span className="shrink-0 text-text-muted">{q.icon}</span>
              <span className="flex-1 truncate">{q.label}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      id: "type",
      label: "Type",
      icon: <Phone size={15} />,
      narrow: true,
      active: (ctx) => isOn(ctx, "channel"),
      render: (ctx) => (
        <div className="flex flex-col gap-1">
          {TYPE_CARDS.map((c) => {
            const on = (ctx.cond("channel")?.values ?? []).includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => ctx.toggleValue("channel", c.value)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${
                  on ? "bg-surface-2 text-text" : "text-text-dim hover:bg-surface-2/60 hover:text-text"
                }`}
              >
                {c.icon}
                {c.label}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      id: "direction",
      label: "Direction",
      icon: <ArrowLeftRight size={15} />,
      narrow: true,
      disabled: typeDisabled("direction"),
      active: (ctx) => isOn(ctx, "direction"),
      render: (ctx) => (
        <div className="flex flex-col gap-1">
          {DIRECTION_CARDS.map((d) => {
            const on = (ctx.cond("direction")?.values ?? []).includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => ctx.toggleValue("direction", d.value)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors ${
                  on ? "bg-surface-2 text-text" : "text-text-dim hover:bg-surface-2/60 hover:text-text"
                }`}
              >
                {d.icon}
                {d.label}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      id: "agent",
      label: "Agent",
      icon: <Bot size={15} />,
      active: (ctx) => isOn(ctx, "agent"),
      wide: true,
      bare: true,
      unstyled: true,
      render: (ctx, p) => (
        <AgentPopout agents={ctx.cond("agent")?.agents ?? {}} dispatch={ctx.dispatch} onApply={p.close} />
      ),
    },
    {
      id: "from",
      label: "Caller",
      icon: <PhoneOutgoing size={15} />,
      disabled: typeDisabled("from"),
      active: (ctx) => isOn(ctx, "from"),
      render: (ctx) => <TextLeaf ctx={ctx} field="from" />,
    },
    {
      id: "to",
      label: "Callee",
      icon: <PhoneIncoming size={15} />,
      disabled: typeDisabled("to"),
      active: (ctx) => isOn(ctx, "to"),
      render: (ctx) => <TextLeaf ctx={ctx} field="to" />,
    },
    {
      id: "callSid",
      label: "Provider call ID",
      icon: <Hash size={15} />,
      disabled: typeDisabled("callSid"),
      active: (ctx) => isOn(ctx, "callSid"),
      render: (ctx) => <TextLeaf ctx={ctx} field="callSid" />,
    },
    {
      id: "campaign",
      label: "Campaign",
      icon: <Megaphone size={15} />,
      disabled: typeDisabled("campaign"),
      active: (ctx) => isOn(ctx, "campaign"),
      render: (ctx) => <TextLeaf ctx={ctx} field="campaign" />,
    },
    {
      id: "task",
      label: "Task",
      icon: <ListChecks size={15} />,
      disabled: typeDisabled("task"),
      active: (ctx) => isOn(ctx, "task"),
      render: (ctx) => <TextLeaf ctx={ctx} field="task" />,
    },
  ] },
  // — outcome & status —
  { title: "Outcome & status", items: [
    {
      id: "outcome",
      label: "Outcome",
      icon: <Flag size={15} />,
      disabled: typeDisabled("outcome"),
      active: (ctx) => isOn(ctx, "outcome"),
      render: (ctx) => (
        <SearchableCheckList
          placeholder="Search outcomes…"
          options={OUTCOMES.map((o) => ({ value: o, label: o, dot: OUTCOME_DOT[o], count: CNT.outcome[o] }))}
          selected={ctx.cond("outcome")?.values ?? []}
          onToggle={(v) => ctx.toggleValue("outcome", v)}
        />
      ),
    },
    {
      id: "endReason",
      label: "End reason",
      icon: <PhoneOff size={15} />,
      disabled: typeDisabled("endReason"),
      active: (ctx) => isOn(ctx, "endReason"),
      render: (ctx) => (
        <MultiSelect
          layout="list"
          options={END_REASONS.map((e) => ({ value: e, label: e, count: CNT.endReason[e] }))}
          selected={ctx.cond("endReason")?.values ?? []}
          onToggle={(v) => ctx.toggleValue("endReason", v)}
        />
      ),
    },
  ] },
  // — metrics —
  { title: "Metrics", items: [
    {
      id: "duration",
      label: "Call duration",
      icon: <Timer size={15} />,
      disabled: typeDisabled("duration"),
      active: (ctx) => isOn(ctx, "duration"),
      render: (ctx) => (
        <RangeSlider min={RANGE.duration.min} max={RANGE.duration.max} step={RANGE.duration.step} unit={RANGE.duration.unit} value={ctx.cond("duration")?.num ?? null} onChange={(num) => ctx.setNum("duration", num)} />
      ),
    },
    {
      id: "turns",
      label: "Turns",
      icon: <MessageSquare size={15} />,
      disabled: typeDisabled("turns"),
      active: (ctx) => isOn(ctx, "turns"),
      render: (ctx) => (
        <RangeSlider min={RANGE.turns.min} max={RANGE.turns.max} step={RANGE.turns.step} value={ctx.cond("turns")?.num ?? null} onChange={(num) => ctx.setNum("turns", num)} />
      ),
    },
    {
      id: "turnLatency",
      label: "Turn latency",
      icon: <Gauge size={15} />,
      disabled: typeDisabled("turnLatency"),
      active: (ctx) => isOn(ctx, "turnLatency"),
      render: (ctx) => (
        <RangeSlider min={RANGE.turnLatency.min} max={RANGE.turnLatency.max} step={RANGE.turnLatency.step} unit={RANGE.turnLatency.unit} value={ctx.cond("turnLatency")?.num ?? null} onChange={(num) => ctx.setNum("turnLatency", num)} />
      ),
    },
    {
      id: "attempt",
      label: "Attempt",
      icon: <Repeat2 size={15} />,
      disabled: typeDisabled("attempt"),
      active: (ctx) => isOn(ctx, "attempt"),
      render: (ctx) => (
        <PillGroup value={ctx.cond("attempt")?.num ?? null} onChange={(num) => ctx.setNum("attempt", num ?? { op: "=", value: null, value2: null })} />
      ),
    },
  ] },
  // — dynamic —
  { title: "Dynamic fields", items: [
    {
      id: "postCall",
      label: "Post-call analysis",
      icon: <ClipboardList size={15} />,
      wide: true,
      bare: true,
      unstyled: true,
      disabled: typeDisabled("postCall"),
      active: (ctx) => ctx.filters.conditions.some((c) => c.field === "postCall" && conditionIsActive(c)),
      render: (ctx) => {
        const agents = ctx.cond("agent")?.agents ?? {};
        const selectedAgents = Object.keys(agents);
        const fields = dedupeFields(selectedAgents.flatMap((a) => agentDef(a)?.postCall ?? []));
        const conds = ctx.filters.conditions.filter((c) => c.field === "postCall");
        return <DynamicGroup group="postCall" gated={selectedAgents.length === 0} fields={fields} conditions={conds} dispatch={ctx.dispatch} />;
      },
    },
    {
      id: "context",
      label: "Context variables",
      icon: <Braces size={15} />,
      wide: true,
      bare: true,
      unstyled: true,
      active: (ctx) => ctx.filters.conditions.some((c) => c.field === "context" && conditionIsActive(c)),
      render: (ctx) => (
        <ContextKeyInput conditions={ctx.filters.conditions.filter((c) => c.field === "context")} dispatch={ctx.dispatch} />
      ),
    },
  ] },
];

function dedupeFields(fields: FieldDef[]): FieldDef[] {
  const seen = new Set<string>();
  return fields.filter((f) => (seen.has(f.key) ? false : (seen.add(f.key), true)));
}

function TextLeaf({ ctx, field }: { ctx: Ctx; field: ConditionField }) {
  const value = ctx.cond(field)?.text ?? "";
  return (
    <input
      autoFocus
      value={value}
      onChange={(e) => ctx.setText(field, e.target.value)}
      placeholder="contains…"
      className="h-9 w-full rounded-lg border border-border-strong bg-surface-2 px-2.5 text-sm text-text outline-none placeholder:text-text-muted"
    />
  );
}

export function FilterMenu(props: FilterMenuProps) {
  const { filters, dispatch, onOpenAdvanced, close, pinned, onTogglePin } = props;
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  /** Vertical anchor mode + offset (px) relative to the menu container. */
  const [anchor, setAnchor] = useState<{ mode: "top" | "bottom"; offset: number }>({ mode: "top", offset: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  /** Cached row screen-rect for the active item — used to re-flip when the flyout's height is known. */
  const activeRowRect = useRef<DOMRect | null>(null);

  // Anchor the flyout at the hovered row's top edge. After mount the ref callback
  // measures the flyout and flips to bottom-anchored if it would overflow the viewport.
  const openAt = (catId: string, el: HTMLElement) => {
    const rootRect = rootRef.current?.getBoundingClientRect();
    const rowRect = el.getBoundingClientRect();
    activeRowRect.current = rowRect;
    if (rootRect) setAnchor({ mode: "top", offset: rowRect.top - rootRect.top });
    setActive(catId);
  };

  // Called by the flyout ref after layout — flip upward if it would clip the viewport bottom.
  const recheckAnchor = (el: HTMLDivElement | null) => {
    if (!el || !rootRef.current || !activeRowRect.current) return;
    const rootRect = rootRef.current.getBoundingClientRect();
    const rowRect = activeRowRect.current;
    const h = el.offsetHeight;
    const margin = 8;
    const fitsBelow = rowRect.top + h + margin <= window.innerHeight;
    if (fitsBelow) {
      const offset = rowRect.top - rootRect.top;
      if (anchor.mode !== "top" || Math.abs(anchor.offset - offset) > 1) {
        setAnchor({ mode: "top", offset });
      }
    } else {
      // Anchor flyout bottom to row bottom — flyout grows upward.
      const offset = rootRect.bottom - rowRect.bottom;
      if (anchor.mode !== "bottom" || Math.abs(anchor.offset - offset) > 1) {
        setAnchor({ mode: "bottom", offset });
      }
    }
  };

  // Condition helpers — mirror FilterPopup's lazy-upsert model.
  const byId: Record<string, Condition> = Object.fromEntries(filters.conditions.map((c) => [c.id, c]));
  const idOf = (field: ConditionField, key?: string) => (key ? `${field}:${key}` : field);
  const cond = (field: ConditionField, key?: string) => byId[idOf(field, key)];
  const ensure = (field: ConditionField, key?: string) => dispatch({ type: "ADD_CONDITION", field, key });
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
  const ctx: Ctx = { filters, dispatch, cond, ensure, setText, setNum, toggleValue };

  const activeCat = SECTIONS.flatMap((s) => s.items).find((c) => c.id === active) ?? null;

  // Filter sections by the search query (matches cat labels). Empty sections are hidden.
  const visibleSections = query
    ? SECTIONS.map((s) => ({ ...s, items: s.items.filter((c) => c.label.toLowerCase().includes(query)) })).filter(
        (s) => s.items.length > 0
      )
    : SECTIONS;

  return (
    <div className="relative flex max-h-[80vh] flex-col" ref={rootRef}>
      {/* search — type to filter the category list */}
      <div className="border-b border-border p-2">
        <div className="flex h-8 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2.5">
          <Search size={13} className="shrink-0 text-text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search filters…"
            className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* header — active count + Clear all only when there are filters */}
      {(() => {
        const activeCount = filters.conditions.filter(conditionIsActive).length;
        if (!activeCount) return null;
        return (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-text-muted">
            <span>
              <span className="font-medium text-text">{activeCount}</span> active
            </span>
            <span className="text-text-dim">·</span>
            <button
              type="button"
              onClick={() => dispatch({ type: "CLEAR_CONDITIONS" })}
              className="text-text-dim hover:text-text"
            >
              Clear all
            </button>
          </div>
        );
      })()}

      {/* category list — scrolls on small viewports */}
      <div className="min-h-0 flex-1 overflow-y-auto py-1 scroll-thin">
        {visibleSections.length === 0 && (
          <p className="px-3 py-3 text-center text-xs text-text-muted">No matching filters.</p>
        )}
        {visibleSections.map((section, si) => (
          <div key={si}>
            {si > 0 && <div className="my-0.5 h-px bg-border" />}
            {section.title && (
              <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {section.title}
              </div>
            )}
            {section.items.map((cat) => {
              const on = cat.active?.(ctx) ?? false;
              const isActive = active === cat.id;
              const leaf = !cat.render;
              const disabledResult = cat.disabled?.(ctx);
              const isDisabled = !!disabledResult;
              return (
                <button
                  key={cat.id}
                  type="button"
                  disabled={isDisabled}
                  title={disabledResult ? disabledResult.reason : undefined}
                  onClick={(e) => {
                    if (isDisabled) return;
                    if (leaf) {
                      cat.onSelect?.(ctx, props);
                      close();
                    } else if (isActive) {
                      setActive(null);
                    } else {
                      openAt(cat.id, e.currentTarget);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (isDisabled || leaf) return;
                    openAt(cat.id, e.currentTarget);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm transition-colors ${
                    isDisabled
                      ? "cursor-not-allowed text-text-muted/50"
                      : isActive
                      ? "bg-surface-2 text-text"
                      : "text-text-dim hover:bg-surface-2/60 hover:text-text"
                  }`}
                >
                  <span className={`shrink-0 ${isDisabled ? "text-text-muted/50" : on ? "text-text" : "text-text-muted"}`}>{cat.icon}</span>
                  <span className="flex-1 truncate">{cat.label}</span>
                  {on && !isDisabled && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />}
                  {!leaf && <ChevronRight size={14} className={`shrink-0 ${isDisabled ? "text-text-muted/50" : "text-text-muted"}`} />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* flyout — anchored to its row, opens to the left of the menu. Flips upward when it would overflow the viewport. */}
      {activeCat?.render && (
        <div
          ref={recheckAnchor}
          style={{
            width: activeCat.wide ? 720 : activeCat.narrow ? 220 : 320,
            ...(anchor.mode === "top" ? { top: anchor.offset } : { bottom: anchor.offset }),
          }}
          className={`absolute right-full mr-2 ${
            activeCat.unstyled
              ? ""
              : `overflow-hidden rounded-lg border border-border-strong bg-surface shadow-xl shadow-black/40 ${activeCat.bare ? "" : "p-3"}`
          }`}
          onMouseEnter={() => setActive(activeCat.id)}
        >
          {!activeCat.bare && (
            <div className="mb-2.5 flex items-center gap-2 text-sm font-medium text-text">
              <span className="text-text-muted">{activeCat.icon}</span>
              {activeCat.label}
            </div>
          )}
          {activeCat.render(ctx, props)}
        </div>
      )}
    </div>
  );
}

/** Search + checkbox list, matching the Agent flyout's search style. Reused by Outcome. */
interface CheckOption { value: string; label: string; dot?: string; count?: number }
function SearchableCheckList({
  placeholder,
  options,
  selected,
  onToggle,
}: {
  placeholder: string;
  options: CheckOption[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const list = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(query)),
    [options, query]
  );
  return (
    <div className="space-y-2">
      <div className="flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-2.5">
        <Search size={13} className="shrink-0 text-text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
        />
      </div>
      <ul className="max-h-56 overflow-y-auto pr-1 scroll-thin">
        {list.map((o) => {
          const on = selected.includes(o.value);
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onToggle(o.value)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                  on ? "bg-surface-2" : "hover:bg-surface-2/60"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    on ? "border-white bg-white text-black" : "border-border-strong"
                  }`}
                >
                  {on && <Check size={11} strokeWidth={3} />}
                </span>
                {o.dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${o.dot}`} />}
                <span className={`flex-1 truncate text-sm ${on ? "text-text" : "text-text-dim"}`}>{o.label}</span>
                {o.count != null && (
                  <span className="shrink-0 tabular-nums text-xs text-text-muted">{o.count}</span>
                )}
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="px-3 py-4 text-center text-xs text-text-muted">No matches.</li>}
      </ul>
    </div>
  );
}
