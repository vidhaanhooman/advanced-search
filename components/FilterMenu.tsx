"use client";

import { useRef, useState } from "react";
import {
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  Phone,
  Bot,
  Flag,
  CheckCircle2,
  PhoneOff,
  Timer,
  MessageSquare,
  Gauge,
  Repeat2,
  PhoneIncoming,
  PhoneOutgoing,
  Megaphone,
  ListChecks,
  ClipboardList,
  Braces,
  Fingerprint,
  Pin,
  PinOff,
} from "lucide-react";
import { MultiSelect } from "./MultiSelect";
import { TokenMultiSelect } from "./TokenMultiSelect";
import { RangeSlider } from "./RangeSlider";
import { PillGroup } from "./PillGroup";
import { AgentPopout } from "./AgentPopout";
import {
  ContextKeyInput,
  DynamicGroup,
  TYPE_CARDS,
  RANGE,
  CNT,
} from "./FilterPopup";
import { OUTCOME_DOT, STATUS_DOT } from "@/lib/display";
import { agentDef } from "@/lib/mockConversations";
import { conditionIsActive } from "@/lib/filters";
import {
  CALL_STATUSES,
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

const SECTIONS: Section[] = [
  // — special —
  { items: [
    {
      id: "ai",
      label: "AI filter",
      icon: <Sparkles size={15} />,
      onSelect: (_ctx, p) => p.onOpenAdvanced(),
    },
    {
      id: "advanced",
      label: "Advanced filter",
      icon: <SlidersHorizontal size={15} />,
      onSelect: (_ctx, p) => p.onOpenAdvanced(),
    },
  ] },
  // — source —
  { items: [
    {
      id: "type",
      label: "Type",
      icon: <Phone size={15} />,
      narrow: true,
      bare: true,
      active: (ctx) => isOn(ctx, "channel"),
      render: (ctx) => (
        <div className="flex flex-col gap-1 p-1">
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
  ] },
  // — outcome & status —
  { title: "Outcome & status", items: [
    {
      id: "outcome",
      label: "Outcome",
      icon: <Flag size={15} />,
      active: (ctx) => isOn(ctx, "outcome"),
      render: (ctx) => (
        <TokenMultiSelect
          placeholder="Select outcomes…"
          options={OUTCOMES.map((o) => ({ value: o, label: o, dot: OUTCOME_DOT[o], count: CNT.outcome[o] }))}
          selected={ctx.cond("outcome")?.values ?? []}
          onToggle={(v) => ctx.toggleValue("outcome", v)}
        />
      ),
    },
    {
      id: "callStatus",
      label: "Call status",
      icon: <CheckCircle2 size={15} />,
      active: (ctx) => isOn(ctx, "callStatus"),
      render: (ctx) => (
        <MultiSelect
          layout="list"
          options={CALL_STATUSES.map((s) => ({ value: s, label: s, dot: STATUS_DOT[s], count: CNT.callStatus[s] }))}
          selected={ctx.cond("callStatus")?.values ?? []}
          onToggle={(v) => ctx.toggleValue("callStatus", v)}
        />
      ),
    },
    {
      id: "endReason",
      label: "End reason",
      icon: <PhoneOff size={15} />,
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
      active: (ctx) => isOn(ctx, "duration"),
      render: (ctx) => (
        <RangeSlider min={RANGE.duration.min} max={RANGE.duration.max} step={RANGE.duration.step} unit={RANGE.duration.unit} value={ctx.cond("duration")?.num ?? null} onChange={(num) => ctx.setNum("duration", num)} />
      ),
    },
    {
      id: "turns",
      label: "Turns",
      icon: <MessageSquare size={15} />,
      active: (ctx) => isOn(ctx, "turns"),
      render: (ctx) => (
        <RangeSlider min={RANGE.turns.min} max={RANGE.turns.max} step={RANGE.turns.step} value={ctx.cond("turns")?.num ?? null} onChange={(num) => ctx.setNum("turns", num)} />
      ),
    },
    {
      id: "turnLatency",
      label: "Turn latency",
      icon: <Gauge size={15} />,
      active: (ctx) => isOn(ctx, "turnLatency"),
      render: (ctx) => (
        <RangeSlider min={RANGE.turnLatency.min} max={RANGE.turnLatency.max} step={RANGE.turnLatency.step} unit={RANGE.turnLatency.unit} value={ctx.cond("turnLatency")?.num ?? null} onChange={(num) => ctx.setNum("turnLatency", num)} />
      ),
    },
    {
      id: "attempt",
      label: "Attempt",
      icon: <Repeat2 size={15} />,
      active: (ctx) => isOn(ctx, "attempt"),
      render: (ctx) => (
        <PillGroup value={ctx.cond("attempt")?.num ?? null} onChange={(num) => ctx.setNum("attempt", num ?? { op: "=", value: null, value2: null })} />
      ),
    },
  ] },
  // — identity (single combined entry) —
  { items: [
    {
      id: "identity",
      label: "Identity",
      icon: <Fingerprint size={15} />,
      active: (ctx) => isOn(ctx, "from") || isOn(ctx, "to") || isOn(ctx, "campaign") || isOn(ctx, "task"),
      render: (ctx) => (
        <div className="space-y-3">
          <IdentityRow ctx={ctx} field="from" label="Caller" icon={<PhoneIncoming size={13} />} />
          <IdentityRow ctx={ctx} field="to" label="Callee" icon={<PhoneOutgoing size={13} />} />
          <IdentityRow ctx={ctx} field="campaign" label="Campaign" icon={<Megaphone size={13} />} />
          <IdentityRow ctx={ctx} field="task" label="Task" icon={<ListChecks size={13} />} />
        </div>
      ),
    },
  ] },
  // — dynamic —
  { title: "Dynamic fields", items: [
    {
      id: "postCall",
      label: "Post-call analysis",
      icon: <ClipboardList size={15} />,
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

function IdentityRow({ ctx, field, label, icon }: { ctx: Ctx; field: ConditionField; label: string; icon: React.ReactNode }) {
  const value = ctx.cond(field)?.text ?? "";
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-xs text-text-muted">
        <span className="shrink-0">{icon}</span>
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => ctx.setText(field, e.target.value)}
        placeholder="contains…"
        className="h-9 w-full rounded-lg border border-border-strong bg-surface-2 px-2.5 text-sm text-text outline-none placeholder:text-text-muted"
      />
    </div>
  );
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

  return (
    <div className="relative" ref={rootRef}>
      {/* header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="text-sm text-text-muted">Add filter…</span>
        <div className="flex items-center gap-1.5">
          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              title={pinned ? "Unpin — close on outside click" : "Pin open for testing"}
              className={`flex h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-medium transition-colors ${
                pinned
                  ? "border-accent/60 bg-accent/15 text-accent"
                  : "border-border-strong bg-surface-2 text-text-muted hover:text-text"
              }`}
            >
              {pinned ? <Pin size={10} /> : <PinOff size={10} />}
              {pinned ? "Pinned" : "Pin"}
            </button>
          )}
          <kbd className="rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">F</kbd>
        </div>
      </div>
      <div className="h-px bg-border" />

      {/* category list — sized to fit every row without scroll */}
      <div className="py-1">
        {SECTIONS.map((section, si) => (
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
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={(e) => {
                    if (leaf) {
                      cat.onSelect?.(ctx, props);
                      close();
                    } else if (isActive) {
                      setActive(null);
                    } else {
                      openAt(cat.id, e.currentTarget);
                    }
                  }}
                  onMouseEnter={(e) => !leaf && openAt(cat.id, e.currentTarget)}
                  className={`flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm transition-colors ${
                    isActive ? "bg-surface-2 text-text" : "text-text-dim hover:bg-surface-2/60 hover:text-text"
                  }`}
                >
                  <span className={`shrink-0 ${on ? "text-text" : "text-text-muted"}`}>{cat.icon}</span>
                  <span className="flex-1 truncate">{cat.label}</span>
                  {on && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  {!leaf && <ChevronRight size={14} className="shrink-0 text-text-muted" />}
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
            width: activeCat.wide ? 580 : activeCat.narrow ? 220 : 320,
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
