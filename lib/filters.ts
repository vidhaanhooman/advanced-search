import type {
  CallStatus,
  Condition,
  Conversation,
  EndReason,
  FilterState,
  NumericFilter,
  Outcome,
  SearchField,
} from "./types";
import { SEARCH_FIELDS } from "./types";
import { NOW, agentDef } from "./mockConversations";
import { CONDITION_LABEL } from "./catalog";

/** Value of a conversation for a scoped-search field. */
function searchFieldValue(c: Conversation, field: SearchField): string | undefined {
  switch (field) {
    case "document_id":
      return c.document_id;
    case "callInfo.callSid":
      return c.callInfo.callSid;
    case "callInfo.campaign":
      return c.callInfo.campaign;
    case "callInfo.task":
      return c.callInfo.task;
    case "callInfo.from":
      return c.callInfo.from;
    case "callInfo.to":
      return c.callInfo.to;
  }
}

// ---------------------------------------------------------------------------
// Numeric operator evaluation (shared by duration, turns, attempt, latency)
// ---------------------------------------------------------------------------

export function matchesNumeric(f: NumericFilter | null | undefined, n: number): boolean {
  if (!f) return true;
  // Range: either bound may be open (null).
  if (f.op === "between") {
    if (f.value == null && f.value2 == null) return true;
    if (f.value != null && n < f.value) return false;
    if (f.value2 != null && n > f.value2) return false;
    return true;
  }
  if (f.value === null) return true;
  switch (f.op) {
    case ">":
      return n > f.value;
    case ">=":
      return n >= f.value;
    case "<":
      return n < f.value;
    case "<=":
      return n <= f.value;
    case "=":
      return n === f.value;
    default:
      return true;
  }
}

function contains(hay: string | undefined, needle: string): boolean {
  if (!needle.trim()) return true;
  return (hay ?? "").toLowerCase().includes(needle.trim().toLowerCase());
}

// ---------------------------------------------------------------------------
// Date preset -> [from, to] window (ms epoch)
// ---------------------------------------------------------------------------

export function dateWindow(date: FilterState["date"]): [number, number] | null {
  const { preset, from, to } = date;
  if (!preset) return null;
  const DAY = 86_400_000;
  if (preset === "custom") {
    if (!from && !to) return null;
    // from/to may be date-only ('yyyy-mm-dd') or datetime ('yyyy-mm-ddTHH:mm').
    // Parse as UTC; a date-only end means "through the whole day" (+1 day).
    const parse = (s: string | null, end: boolean) => {
      if (!s) return end ? Infinity : -Infinity;
      if (s.includes("T")) return new Date(s.length === 16 ? `${s}:00Z` : s).getTime();
      const t = new Date(s).getTime();
      return end ? t + DAY : t;
    };
    return [parse(from, false), parse(to, true)];
  }
  const todayStart = Math.floor(NOW / DAY) * DAY;
  if (preset === "last24") return [NOW - DAY, NOW];
  if (preset === "today") return [todayStart, NOW];
  if (preset === "yesterday") return [todayStart - DAY, todayStart];
  if (preset === "last7") return [NOW - 7 * DAY, NOW];
  if (preset === "last30") return [NOW - 30 * DAY, NOW];
  const d = new Date(NOW);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (preset === "thisMonth") return [Date.UTC(y, m, 1), NOW];
  if (preset === "lastMonth") return [Date.UTC(y, m - 1, 1), Date.UTC(y, m, 1)];
  if (preset === "last3Months") return [Date.UTC(y, m - 2, 1), NOW];
  return null;
}

// ---------------------------------------------------------------------------
// Single-condition evaluation
// ---------------------------------------------------------------------------

function matchesCondition(c: Conversation, cond: Condition): boolean {
  switch (cond.field) {
    case "agent": {
      const names = Object.keys(cond.agents ?? {});
      if (!names.length) return true;
      if (!names.includes(c.agent)) return false;
      const versions = cond.agents![c.agent];
      return !versions.length || versions.includes(c.version);
    }
    case "channel": {
      // Type filter: chat (web), conversation (call+conversation agent), broadcast (call+broadcast agent).
      const v = cond.values ?? [];
      if (!v.length) return true;
      const kind = agentDef(c.agent)?.kind;
      return v.some((val) => {
        switch (val) {
          case "chat":
            return c.type === "web";
          case "conversation":
            return c.type === "call" && kind === "conversation";
          case "broadcast":
            return c.type === "call" && kind === "broadcast";
          default:
            return false;
        }
      });
    }
    case "direction": {
      const v = cond.values ?? [];
      if (!v.length) return true;
      return !!c.callInfo.direction && v.includes(c.callInfo.direction);
    }
    case "outcome": {
      const v = (cond.values ?? []) as Outcome[];
      return !v.length || v.some((o) => c.outcome.includes(o));
    }
    case "callStatus": {
      const v = (cond.values ?? []) as CallStatus[];
      return !v.length || (!!c.callInfo.status && v.includes(c.callInfo.status));
    }
    case "endReason": {
      const v = (cond.values ?? []) as EndReason[];
      return !v.length || (!!c.callInfo.endReason && v.includes(c.callInfo.endReason));
    }
    case "duration":
      return matchesNumeric(cond.num, c.duration);
    case "turns":
      return matchesNumeric(cond.num, c.stats.turns);
    case "turnLatency":
      return matchesNumeric(cond.num, c.stats.latency.turn.avg);
    case "attempt":
      return matchesNumeric(cond.num, c.callInfo.attempt ?? 0);
    case "from":
      return contains(c.callInfo.from, cond.text ?? "");
    case "to":
      return contains(c.callInfo.to, cond.text ?? "");
    case "campaign":
      return contains(c.callInfo.campaign, cond.text ?? "");
    case "task":
      return contains(c.callInfo.task, cond.text ?? "");
    case "postCall":
    case "context": {
      const rec = cond.field === "postCall" ? c.postCallAnalysis : c.contextVariables;
      const val = rec[cond.key ?? ""];
      return matchesDynamic(cond, val);
    }
    default:
      return true;
  }
}

/** Match an agent-dependent (postCall/context) field by its chosen mode. */
function matchesDynamic(cond: Condition, val: string | number | boolean | undefined): boolean {
  switch (cond.mode) {
    case "number":
      return val !== undefined && matchesNumeric(cond.num, Number(val));
    case "boolean":
      return !cond.text ? true : val !== undefined && String(val) === cond.text;
    case "specific": {
      const v = cond.values ?? [];
      return !v.length || (val !== undefined && v.includes(String(val)));
    }
    case "date": {
      if (!cond.text) return true;
      const [from, to] = cond.text.split("|");
      const d = String(val ?? "");
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }
    default:
      if (!cond.text?.trim()) return true;
      return val !== undefined && contains(String(val), cond.text);
  }
}

// ---------------------------------------------------------------------------
// Main predicate
// ---------------------------------------------------------------------------

export function applyFilters(rows: Conversation[], f: FilterState): Conversation[] {
  const window = dateWindow(f.date);
  return rows.filter((c) => {
    // Scoped search (contains, case-insensitive)
    if (f.search.query.trim()) {
      if (!contains(searchFieldValue(c, f.search.field), f.search.query)) return false;
    }
    // Segmented type
    if (f.type && c.type !== f.type) return false;
    // Date window
    if (window) {
      const t = new Date(c.beginTimestamp).getTime();
      if (t < window[0] || t > window[1]) return false;
    }
    // Conditions
    for (const cond of f.conditions) {
      if (!matchesCondition(c, cond)) return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Count of conditions that actually constrain (for the Filter badge)
// ---------------------------------------------------------------------------

export function conditionIsActive(cond: Condition): boolean {
  switch (cond.field) {
    case "agent":
      return Object.keys(cond.agents ?? {}).length > 0;
    case "channel":
    case "direction":
    case "outcome":
    case "callStatus":
    case "endReason":
      return (cond.values ?? []).length > 0;
    case "duration":
    case "turns":
    case "turnLatency":
    case "attempt":
      return cond.num != null && (cond.num.value != null || cond.num.value2 != null);
    case "postCall":
    case "context":
      // By match mode: numeric/specific/text/date/boolean carry values differently.
      if (cond.mode === "number")
        return cond.num != null && (cond.num.value != null || cond.num.value2 != null);
      if (cond.mode === "specific") return (cond.values ?? []).length > 0;
      return !!cond.text?.trim();
    default:
      return !!cond.text?.trim();
  }
}

export function drawerActiveCount(f: FilterState): number {
  return f.conditions.filter(conditionIsActive).length;
}

// ---------------------------------------------------------------------------
// Active-filter chips (all controls) — for the chip row + Clear all
// ---------------------------------------------------------------------------

export interface ActiveChip {
  id: string;
  label: string;
}

function numericLabel(name: string, f: NumericFilter): string {
  if (f.op === "between") {
    if (f.value != null && f.value2 != null) return `${name} ${f.value}–${f.value2}`;
    if (f.value != null) return `${name} ≥ ${f.value}`;
    if (f.value2 != null) return `${name} ≤ ${f.value2}`;
    return name;
  }
  if (f.op === ">=") return `${name} ${f.value}+`;
  if (f.op === "=") return `${name} ${f.value}`;
  return `${name} ${f.op} ${f.value}`;
}

export function conditionLabel(cond: Condition): string | null {
  if (!conditionIsActive(cond)) return null;
  const base = cond.key ? cond.key : CONDITION_LABEL[cond.field] ?? cond.field;
  switch (cond.field) {
    case "agent": {
      const names = Object.keys(cond.agents ?? {});
      const first = names[0];
      const versions = cond.agents![first];
      const extra = names.length > 1 ? ` +${names.length - 1}` : "";
      const vlabel = versions.length ? ` (${versions.join(", ")})` : "";
      return `Agent: ${first}${vlabel}${extra}`;
    }
    case "channel":
    case "direction":
    case "outcome":
    case "callStatus":
    case "endReason":
      return `${base}: ${(cond.values ?? []).join(", ")}`;
    case "duration":
    case "turns":
    case "turnLatency":
    case "attempt":
      return numericLabel(base, cond.num!);
    case "postCall":
    case "context":
      if (cond.mode === "number") return numericLabel(base, cond.num!);
      if (cond.mode === "specific") return `${base}: ${(cond.values ?? []).join(", ")}`;
      if (cond.mode === "date") {
        const [from, to] = (cond.text ?? "").split("|");
        return `${base}: ${from || "…"} → ${to || "…"}`;
      }
      if (cond.mode === "boolean") return `${base}: ${cond.text === "true" ? "Yes" : "No"}`;
      return `${base}: ${cond.text}`;
    default:
      return `${base}: ${cond.text}`;
  }
}

export function activeChips(f: FilterState): ActiveChip[] {
  const chips: ActiveChip[] = [];

  if (f.search.query.trim()) {
    const label = SEARCH_FIELDS.find((s) => s.value === f.search.field)?.label ?? "Search";
    chips.push({ id: "search", label: `${label}: "${f.search.query.trim()}"` });
  }
  if (f.type) chips.push({ id: "type", label: `Type: ${f.type}` });
  if (f.date.preset) chips.push({ id: "date", label: `Date: ${datePresetLabel(f.date)}` });

  for (const cond of f.conditions) {
    const label = conditionLabel(cond);
    if (label) chips.push({ id: `cond:${cond.id}`, label });
  }
  return chips;
}

export function datePresetLabel(date: FilterState["date"]): string {
  switch (date.preset) {
    case "last24":
      return "Last 24 hours";
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "last7":
      return "Last 7 days";
    case "last30":
      return "Last 30 days";
    case "thisMonth":
      return "This month";
    case "lastMonth":
      return "Last month";
    case "last3Months":
      return "Last 3 months";
    case "custom": {
      const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const f = (s: string | null) =>
        s ? `${Number(s.slice(8, 10))} ${m[Number(s.slice(5, 7)) - 1]}` : "…";
      return `${f(date.from)} – ${f(date.to)}`;
    }
    default:
      return "";
  }
}
