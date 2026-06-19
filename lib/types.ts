// ---------------------------------------------------------------------------
// Domain model
// ---------------------------------------------------------------------------
// Field paths in comments mirror the future backend document shape so the
// filter state can later be serialized straight into query params.

export type ConversationType = "web" | "call";
export type CallDirection = "inbound" | "outbound";

export type Outcome =
  | "connected"
  | "not_interested"
  | "meeting_booked"
  | "no_response"
  | "resolved"
  | "unknown"
  | "callback_requested"
  | "agent_transfer"
  | "escalated"
  | "voicemail_left"
  | "wrong_number"
  | "do_not_call"
  | "language_barrier"
  | "partial_info"
  | "follow_up_scheduled";

export type CallStatus =
  | "completed"
  | "failed"
  | "busy"
  | "no_answer"
  | "in_progress";

export type EndReason =
  | "completed"
  | "caller_hangup"
  | "agent_hangup"
  | "no_answer"
  | "voicemail";

export interface CallInfo {
  type: ConversationType; // callInfo.type
  direction?: CallDirection; // inbound | outbound (call only)
  from?: string; // callInfo.from
  to?: string; // callInfo.to
  campaign?: string; // callInfo.campaign
  task?: string; // callInfo.task
  callSid?: string; // callInfo.callSid (provider call id)
  attempt?: number; // callInfo.attempt
  status?: CallStatus; // callInfo.status
  endReason?: EndReason; // callInfo.endReason
}

export interface ConversationStats {
  turns: number; // stats.turns
  latency: { turn: { avg: number } }; // stats.latency.turn.avg (ms)
}

export interface Conversation {
  document_id: string;
  beginTimestamp: string; // ISO string
  type: ConversationType;
  agent: string;
  agentSlug: string; // monospace identifier shown under the name
  version: string;
  callInfo: CallInfo;
  duration: number; // seconds
  stats: ConversationStats;
  outcome: Outcome[];
  postCallAnalysis: Record<string, string | number | boolean>;
  contextVariables: Record<string, string | number | boolean>;
}

// ---------------------------------------------------------------------------
// Agent registry — drives the agent multi-select & dynamic conditions
// ---------------------------------------------------------------------------

// Agent-dependent analysis/context fields can be numerous and typed.
export type FieldType = "string" | "number" | "boolean" | "enum" | "date";

export interface FieldDef {
  key: string;
  type: FieldType;
  values?: string[]; // allowed options for enum
}

export interface AgentVersion {
  id: string;
  name: string;
}

export type AgentKind = "conversation" | "broadcast";

export interface AgentDef {
  id: string;
  name: string;
  kind: AgentKind;
  versions: AgentVersion[];
  postCall: FieldDef[];
  context: FieldDef[];
}

// ---------------------------------------------------------------------------
// Filter state — centralized & serializable
// ---------------------------------------------------------------------------

export type SearchField =
  | "document_id"
  | "callInfo.callSid"
  | "callInfo.campaign"
  | "callInfo.task"
  | "callInfo.from"
  | "callInfo.to";

export type Operator = ">" | ">=" | "<" | "<=" | "=" | "between";

export interface NumericFilter {
  op: Operator;
  value: number | null;
  value2: number | null; // used for "between"
}

export type DatePreset =
  | "last24"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "custom"
  | null;

export interface AgentSelection {
  // agent name -> selected versions ([] means "all versions of this agent")
  [agent: string]: string[];
}

// ---- Condition builder model -------------------------------------------------
// Each condition is one row added from the Filter popup catalog. The `id` is the
// catalog field key (unique per field; dynamic fields are `postCall:<key>` etc).

export type ConditionField =
  | "agent"
  | "channel"
  | "direction"
  | "duration"
  | "from"
  | "to"
  | "outcome"
  | "callStatus"
  | "endReason"
  | "turns"
  | "turnLatency"
  | "attempt"
  | "campaign"
  | "task"
  | "postCall"
  | "context";

// How a dynamic (post-call/context) field is matched — user-selectable.
export type MatchMode = "specific" | "text" | "number" | "boolean" | "date";

export interface Condition {
  id: string; // unique instance key
  field: ConditionField;
  key?: string; // for postCall/context: which dynamic key
  vtype?: FieldType; // native value type for dynamic fields
  mode?: MatchMode; // chosen match mode for dynamic fields
  // value carriers (only the relevant one is used per field)
  agents?: AgentSelection;
  values?: string[];
  num?: NumericFilter;
  text?: string; // string contains; boolean "true"/"false"; date "from|to"
}

export interface FilterState {
  search: { field: SearchField; query: string };
  type: ConversationType | null; // segmented All/Call/Web (null = All)
  date: { preset: DatePreset; from: string | null; to: string | null };
  conditions: Condition[];
}

export const EMPTY_NUMERIC: NumericFilter = {
  op: ">",
  value: null,
  value2: null,
};

export const INITIAL_FILTERS: FilterState = {
  search: { field: "document_id", query: "" },
  type: null,
  date: { preset: null, from: null, to: null },
  conditions: [],
};

export const SEARCH_FIELDS: { value: SearchField; label: string }[] = [
  { value: "document_id", label: "Conversation ID" },
  { value: "callInfo.callSid", label: "Provider call ID" },
  { value: "callInfo.campaign", label: "Campaign ID" },
  { value: "callInfo.task", label: "Task ID" },
  { value: "callInfo.from", label: "Caller" },
  { value: "callInfo.to", label: "Callee" },
];

export const TYPE_SEGMENTS: { value: ConversationType | null; label: string }[] =
  [
    { value: null, label: "All" },
    { value: "call", label: "Call" },
    { value: "web", label: "Web" },
  ];

export const OUTCOMES: Outcome[] = [
  "connected",
  "resolved",
  "not_interested",
  "meeting_booked",
  "no_response",
  "unknown",
  "callback_requested",
  "agent_transfer",
  "escalated",
  "voicemail_left",
  "wrong_number",
  "do_not_call",
  "language_barrier",
  "partial_info",
  "follow_up_scheduled",
];

export const CALL_STATUSES: CallStatus[] = [
  "completed",
  "failed",
  "busy",
  "no_answer",
  "in_progress",
];

export const END_REASONS: EndReason[] = [
  "completed",
  "caller_hangup",
  "agent_hangup",
  "no_answer",
  "voicemail",
];
