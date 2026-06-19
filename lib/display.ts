import type { CallStatus, Conversation, Outcome } from "./types";

// Leading status-dot colors (Tailwind bg-* classes) shared by the table chips,
// the command-item multi-selects, and the active-filter chips.
export const OUTCOME_DOT: Record<Outcome, string> = {
  connected: "bg-emerald-400",
  resolved: "bg-emerald-400",
  meeting_booked: "bg-indigo-400",
  not_interested: "bg-rose-400",
  no_response: "bg-amber-400",
  unknown: "bg-neutral-400",
  callback_requested: "bg-sky-400",
  agent_transfer: "bg-violet-400",
  escalated: "bg-rose-400",
  voicemail_left: "bg-amber-400",
  wrong_number: "bg-neutral-400",
  do_not_call: "bg-rose-400",
  language_barrier: "bg-amber-400",
  partial_info: "bg-sky-400",
  follow_up_scheduled: "bg-indigo-400",
};

export const STATUS_DOT: Record<CallStatus, string> = {
  completed: "bg-emerald-400",
  failed: "bg-rose-400",
  busy: "bg-amber-400",
  no_answer: "bg-neutral-400",
  in_progress: "bg-sky-400",
};

/** Distinct values observed for a dynamic post-call/context key (for "specific"). */
export function distinctValues(
  rows: Conversation[],
  group: "postCall" | "context",
  key: string
): string[] {
  const set = new Set<string>();
  for (const c of rows) {
    const rec = group === "postCall" ? c.postCallAnalysis : c.contextVariables;
    const v = rec[key];
    if (v !== undefined) set.add(String(v));
  }
  return Array.from(set).sort();
}

/** Min/max of a dynamic numeric field across the dataset (for range sliders). */
export function numericDomain(
  rows: Conversation[],
  group: "postCall" | "context",
  key: string
): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const c of rows) {
    const rec = group === "postCall" ? c.postCallAnalysis : c.contextVariables;
    const v = rec[key];
    if (typeof v === "number") {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 100 };
  if (min === max) return { min: Math.min(0, min), max: max + 1 };
  return { min: Math.floor(min), max: Math.ceil(max) };
}

/** Count how many conversations carry a given option value for a field. */
export function countBy(
  rows: Conversation[],
  pick: (c: Conversation) => string | string[] | undefined
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of rows) {
    const v = pick(c);
    if (v == null) continue;
    for (const key of Array.isArray(v) ? v : [v]) {
      out[key] = (out[key] ?? 0) + 1;
    }
  }
  return out;
}


