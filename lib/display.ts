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
};

export const STATUS_DOT: Record<CallStatus, string> = {
  completed: "bg-emerald-400",
  failed: "bg-rose-400",
  busy: "bg-amber-400",
  no_answer: "bg-neutral-400",
  in_progress: "bg-sky-400",
};

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

/** Bucket a numeric field across a fixed [min,max] domain (for slider histograms). */
export function histogram(
  rows: Conversation[],
  pick: (c: Conversation) => number | undefined,
  min: number,
  max: number,
  buckets = 32
): number[] {
  const span = max - min || 1;
  const out = new Array(buckets).fill(0);
  for (const c of rows) {
    const v = pick(c);
    if (v == null) continue;
    let i = Math.floor(((v - min) / span) * buckets);
    if (i < 0) i = 0;
    if (i >= buckets) i = buckets - 1;
    out[i]++;
  }
  return out;
}

