import type { ConditionField } from "./types";

// Human labels for each condition field — used in active-filter chip text.
export const CONDITION_LABEL: Record<string, string> = {
  agent: "Agent",
  channel: "Type",
  direction: "Direction",
  duration: "Call duration",
  from: "Caller (from)",
  to: "Callee (to)",
  outcome: "Outcome",
  callStatus: "Call status",
  endReason: "End reason",
  turns: "Turns",
  turnLatency: "Turn latency",
  attempt: "Attempt",
  campaign: "Campaign ID",
  task: "Task ID",
  callSid: "Provider call ID",
};

// The fixed "BASE" catalog (left pane of the filter modal).
export const BASE_FIELDS: { field: ConditionField; label: string }[] = [
  { field: "agent", label: "Agent" },
  { field: "channel", label: "Type" },
  { field: "duration", label: "Call duration" },
  { field: "from", label: "Caller (from)" },
  { field: "to", label: "Callee (to)" },
  { field: "outcome", label: "Outcome" },
  { field: "callStatus", label: "Call status" },
  { field: "endReason", label: "End reason" },
  { field: "turns", label: "Turns" },
  { field: "turnLatency", label: "Turn latency" },
  { field: "attempt", label: "Attempt" },
  { field: "campaign", label: "Campaign ID" },
  { field: "task", label: "Task ID" },
];
