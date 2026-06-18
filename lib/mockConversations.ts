import type { AgentDef, Conversation, FieldDef } from "./types";

// ---------------------------------------------------------------------------
// Agent registry — agent-dependent analysis/context fields are typed and can be
// numerous (these lists simulate a backend field schema per agent).
// ---------------------------------------------------------------------------

const f = (key: string, type: FieldDef["type"], values?: string[]): FieldDef => ({ key, type, values });

const SENTIMENT = ["positive", "neutral", "negative"];

// A deliberately large post-call schema to demonstrate scale (search-to-add).
const DEBT_POSTCALL: FieldDef[] = [
  f("promise_to_pay", "boolean"),
  f("objection_raised", "boolean"),
  f("sentiment", "enum", SENTIMENT),
  f("agent_callback", "boolean"),
  f("agent_visit_status", "enum", ["scheduled", "completed", "missed", "none"]),
  f("appointment_date", "date"),
  f("appointment_time", "string"),
  f("additional_requirements", "string"),
  f("age", "number"),
  f("bonus_committed", "boolean"),
  f("amount_committed", "number"),
  f("payment_method", "enum", ["upi", "card", "cash", "bank_transfer"]),
  f("language", "enum", ["en", "hi", "ta", "te"]),
  f("escalation_needed", "boolean"),
  f("followup_required", "boolean"),
  f("dispute_raised", "boolean"),
  f("contact_quality", "enum", ["good", "fair", "poor"]),
  f("resolution_status", "enum", ["resolved", "pending", "unresolved"]),
  f("next_action", "string"),
  f("ptp_date", "date"),
  f("ptp_amount", "number"),
  f("risk_score", "number"),
  f("compliance_flag", "boolean"),
  f("call_summary", "string"),
];

const DEBT_CONTEXT: FieldDef[] = [
  f("due_amount", "number"),
  f("customer_name", "string"),
  f("language", "enum", ["en", "hi", "ta", "te"]),
  f("region", "enum", ["North", "South", "East", "West"]),
  f("account_id", "string"),
  f("days_past_due", "number"),
  f("loan_type", "enum", ["personal", "auto", "home", "credit_card"]),
  f("last_payment_date", "date"),
];

// version: id is the stable identifier (matches conversation.version), name is the label.
const vv = (id: string, name: string) => ({ id, name });

export const AGENTS: AgentDef[] = [
  {
    id: "agt_debt_pitch",
    name: "Debt Collection Pitch Agent",
    versions: [
      vv("v1", "v1 · GA"),
      vv("v2", "v2 · GA"),
      vv("v3_rerank_2024q4_hindi_pilot", "v3 · Rerank Q4 (Hindi pilot)"),
      vv("v4_beta", "v4 · Beta"),
      vv("v5_canary_2025q1", "v5 · Canary Q1"),
      vv("v6_multilingual", "v6 · Multilingual"),
      vv("v7_rerank_v2", "v7 · Rerank v2"),
      vv("v8_objection_tuned", "v8 · Objection-tuned"),
      vv("v9_prod_2025q2", "v9 · Prod Q2"),
    ],
    postCall: DEBT_POSTCALL,
    context: DEBT_CONTEXT,
  },
  {
    id: "agt_debt_outbound",
    name: "Debt Collection Outbound Agent",
    versions: [vv("v1", "v1 · GA")],
    postCall: [
      f("callback_requested", "boolean"),
      f("sentiment", "enum", SENTIMENT),
      f("best_time_to_call", "string"),
      f("amount_committed", "number"),
    ],
    context: [f("due_amount", "number"), f("region", "enum", ["North", "South", "East", "West"])],
  },
  {
    id: "agt_careers360",
    name: "Careers_360 - Tech college predictor",
    versions: [vv("v1", "v1 · GA")],
    postCall: [
      f("lead_quality", "enum", ["low", "medium", "high"]),
      f("course_interest", "enum", ["CSE", "ECE", "ME", "CE"]),
      f("counselling_booked", "boolean"),
      f("budget", "number"),
    ],
    context: [f("exam_score", "number"), f("target_branch", "enum", ["CSE", "ECE", "ME", "CE"])],
  },
];

const SLUG: Record<string, string> = {
  "Debt Collection Pitch Agent": "debt_pitch",
  "Debt Collection Outbound Agent": "debt_outbound",
  "Careers_360 - Tech college predictor": "careers360_predictor",
};

export function agentDef(name: string): AgentDef | undefined {
  return AGENTS.find((a) => a.name === name);
}

// Deterministic value generation so every field actually filters (no real backend).
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function genValue(field: FieldDef, seed: string): string | number | boolean {
  const h = hashStr(`${seed}:${field.key}`);
  switch (field.type) {
    case "boolean":
      return h % 2 === 0;
    case "number":
      return h % 100;
    case "enum":
      return field.values![h % field.values!.length];
    case "date":
      return new Date(Date.UTC(2026, 5, 1) + (h % 40) * 86_400_000).toISOString().slice(0, 10);
    default:
      return `${field.key}_${h % 6}`;
  }
}
function genRecord(fields: FieldDef[], seed: string): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const fd of fields) out[fd.key] = genValue(fd, seed);
  return out;
}

// ---------------------------------------------------------------------------
// Mock conversations — fixed timestamps relative to a stable anchor so the
// date presets are demonstrable without depending on the real clock.
// ---------------------------------------------------------------------------

const ANCHOR = new Date("2026-06-18T12:00:00Z").getTime();
const hoursAgo = (h: number) => new Date(ANCHOR - h * 3600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);

export const NOW = ANCHOR;

const RAW_CONVERSATIONS: Conversation[] = [
  {
    document_id: "CPgQJqDlImyXpHs",
    beginTimestamp: hoursAgo(2),
    type: "web",
    agent: "Debt Collection Pitch Agent",
    agentSlug: SLUG["Debt Collection Pitch Agent"],
    version: "v3_rerank_2024q4_hindi_pilot",
    callInfo: { type: "web", campaign: "CMP-9001", task: "TSK-4410", attempt: 1 },
    duration: 172,
    stats: { turns: 17, latency: { turn: { avg: 820 } } },
    outcome: ["not_interested", "connected"],
    postCallAnalysis: { "Promise to pay": false, "Objection raised": true, Sentiment: "negative" },
    contextVariables: { due_amount: 12500, customer_name: "R. Mehta", language: "en" },
  },
  {
    document_id: "hI976BS1RTS0dYL",
    beginTimestamp: hoursAgo(6),
    type: "call",
    agent: "Debt Collection Pitch Agent",
    agentSlug: SLUG["Debt Collection Pitch Agent"],
    version: "v3_rerank_2024q4_hindi_pilot",
    callInfo: {
      type: "call",
      direction: "outbound",
      from: "+919240938766",
      to: "+918269077177",
      campaign: "CMP-9001",
      task: "TSK-4411",
      callSid: "CA8f21d0e7b1c94a2f",
      attempt: 2,
      status: "completed",
      endReason: "completed",
    },
    duration: 307,
    stats: { turns: 27, latency: { turn: { avg: 740 } } },
    outcome: ["meeting_booked", "connected"],
    postCallAnalysis: { "Promise to pay": true, "Objection raised": false, Sentiment: "positive" },
    contextVariables: { due_amount: 48200, customer_name: "S. Iyer", language: "hi" },
  },
  {
    document_id: "hEMBZaSwFGDYD",
    beginTimestamp: hoursAgo(20),
    type: "call",
    agent: "Debt Collection Pitch Agent",
    agentSlug: SLUG["Debt Collection Pitch Agent"],
    version: "v2",
    callInfo: {
      type: "call",
      direction: "outbound",
      from: "+919876543210",
      to: "+919812345678",
      campaign: "CMP-8800",
      task: "TSK-3300",
      callSid: "CA1b9c3a7e2d40f8a1",
      attempt: 1,
      status: "failed",
      endReason: "caller_hangup",
    },
    duration: 210,
    stats: { turns: 19, latency: { turn: { avg: 910 } } },
    outcome: ["unknown", "connected"],
    postCallAnalysis: { "Promise to pay": false, "Objection raised": true, Sentiment: "neutral" },
    contextVariables: { due_amount: 22100, customer_name: "A. Khan", language: "hi" },
  },
  {
    document_id: "mTzdqOKWA0rmU",
    beginTimestamp: daysAgo(2),
    type: "web",
    agent: "Debt Collection Pitch Agent",
    agentSlug: SLUG["Debt Collection Pitch Agent"],
    version: "v2",
    callInfo: { type: "web", campaign: "CMP-8800", task: "TSK-3301", attempt: 1 },
    duration: 54,
    stats: { turns: 5, latency: { turn: { avg: 1180 } } },
    outcome: ["unknown", "connected"],
    postCallAnalysis: { "Promise to pay": false, "Objection raised": false, Sentiment: "neutral" },
    contextVariables: { due_amount: 7800, customer_name: "D. Roy", language: "en" },
  },
  {
    document_id: "ei81IdJnlXDkf2qU",
    beginTimestamp: daysAgo(3),
    type: "web",
    agent: "Debt Collection Outbound Agent",
    agentSlug: SLUG["Debt Collection Outbound Agent"],
    version: "v1",
    callInfo: { type: "web", campaign: "CMP-7200", task: "TSK-2100", attempt: 1 },
    duration: 29,
    stats: { turns: 3, latency: { turn: { avg: 1320 } } },
    outcome: ["unknown", "connected"],
    postCallAnalysis: { "Callback requested": true, Sentiment: "neutral" },
    contextVariables: { due_amount: 5300, region: "North" },
  },
  {
    document_id: "qrRQncAVZUt7c1T",
    beginTimestamp: daysAgo(4),
    type: "web",
    agent: "Careers_360 - Tech college predictor",
    agentSlug: SLUG["Careers_360 - Tech college predictor"],
    version: "v1",
    callInfo: { type: "web", campaign: "CMP-CAR-1", task: "TSK-CAR-9", attempt: 1 },
    duration: 7,
    stats: { turns: 1, latency: { turn: { avg: 640 } } },
    outcome: ["no_response", "connected"],
    postCallAnalysis: { "Lead quality": "low", "Course interest": "CSE" },
    contextVariables: { exam_score: 612, target_branch: "CSE" },
  },
  {
    document_id: "FGyu8LcQrStvw1Zx",
    beginTimestamp: hoursAgo(4),
    type: "web",
    agent: "Careers_360 - Tech college predictor",
    agentSlug: SLUG["Careers_360 - Tech college predictor"],
    version: "v1",
    callInfo: { type: "web", campaign: "CMP-CAR-1", task: "TSK-CAR-30", attempt: 1 },
    duration: 64,
    stats: { turns: 12, latency: { turn: { avg: 540 } } },
    outcome: ["resolved", "connected"],
    postCallAnalysis: { "Lead quality": "high", "Course interest": "CSE" },
    contextVariables: { exam_score: 752, target_branch: "CSE" },
  },
  {
    document_id: "HJza0MdRuWxyq8Vc",
    beginTimestamp: hoursAgo(8),
    type: "web",
    agent: "Careers_360 - Tech college predictor",
    agentSlug: SLUG["Careers_360 - Tech college predictor"],
    version: "v1",
    callInfo: { type: "web", campaign: "CMP-CAR-1", task: "TSK-CAR-31", attempt: 1 },
    duration: 23,
    stats: { turns: 6, latency: { turn: { avg: 880 } } },
    outcome: ["no_response"],
    postCallAnalysis: { "Lead quality": "low", "Course interest": "ECE" },
    contextVariables: { exam_score: 540, target_branch: "ECE" },
  },
  {
    document_id: "Zk29PLamQ7Wd3xR",
    beginTimestamp: daysAgo(5),
    type: "call",
    agent: "Debt Collection Pitch Agent",
    agentSlug: SLUG["Debt Collection Pitch Agent"],
    version: "v3_rerank_2024q4_hindi_pilot",
    callInfo: {
      type: "call",
      direction: "inbound",
      from: "+918001234567",
      to: "+919240938766",
      campaign: "CMP-9001",
      task: "TSK-4415",
      callSid: "CA77aa12bb34cc56dd",
      attempt: 1,
      status: "completed",
      endReason: "agent_hangup",
    },
    duration: 145,
    stats: { turns: 14, latency: { turn: { avg: 690 } } },
    outcome: ["connected"],
    postCallAnalysis: { "Promise to pay": true, "Objection raised": false, Sentiment: "positive" },
    contextVariables: { due_amount: 18900, customer_name: "P. Nair", language: "en" },
  },
  {
    document_id: "Bv5tNciUoP1asQz",
    beginTimestamp: daysAgo(6),
    type: "call",
    agent: "Debt Collection Outbound Agent",
    agentSlug: SLUG["Debt Collection Outbound Agent"],
    version: "v1",
    callInfo: {
      type: "call",
      direction: "outbound",
      from: "+919240938766",
      to: "+917700112233",
      campaign: "CMP-7200",
      task: "TSK-2101",
      callSid: "CA90fe88dd22aa11cc",
      attempt: 3,
      status: "no_answer",
      endReason: "no_answer",
    },
    duration: 12,
    stats: { turns: 2, latency: { turn: { avg: 1550 } } },
    outcome: ["no_response"],
    postCallAnalysis: { "Callback requested": false, Sentiment: "neutral" },
    contextVariables: { due_amount: 9400, region: "West" },
  },
  {
    document_id: "Lq8wYbHmKn04eUf",
    beginTimestamp: daysAgo(8),
    type: "web",
    agent: "Careers_360 - Tech college predictor",
    agentSlug: SLUG["Careers_360 - Tech college predictor"],
    version: "v1",
    callInfo: { type: "web", campaign: "CMP-CAR-1", task: "TSK-CAR-12", attempt: 1 },
    duration: 96,
    stats: { turns: 9, latency: { turn: { avg: 580 } } },
    outcome: ["meeting_booked", "connected"],
    postCallAnalysis: { "Lead quality": "high", "Course interest": "ECE" },
    contextVariables: { exam_score: 781, target_branch: "ECE" },
  },
  {
    document_id: "Tm3rXsAdJq9bV2c",
    beginTimestamp: daysAgo(11),
    type: "call",
    agent: "Debt Collection Pitch Agent",
    agentSlug: SLUG["Debt Collection Pitch Agent"],
    version: "v2",
    callInfo: {
      type: "call",
      direction: "outbound",
      from: "+919876543210",
      to: "+919900887766",
      campaign: "CMP-8800",
      task: "TSK-3310",
      callSid: "CA12ab34cd56ef7890",
      attempt: 2,
      status: "busy",
      endReason: "voicemail",
    },
    duration: 33,
    stats: { turns: 4, latency: { turn: { avg: 1010 } } },
    outcome: ["no_response"],
    postCallAnalysis: { "Promise to pay": false, "Objection raised": false, Sentiment: "neutral" },
    contextVariables: { due_amount: 15600, customer_name: "K. Bose", language: "hi" },
  },
  {
    document_id: "Wp6zFgEtRy81nMa",
    beginTimestamp: daysAgo(15),
    type: "web",
    agent: "Debt Collection Pitch Agent",
    agentSlug: SLUG["Debt Collection Pitch Agent"],
    version: "v1",
    callInfo: { type: "web", campaign: "CMP-8800", task: "TSK-3320", attempt: 1 },
    duration: 264,
    stats: { turns: 23, latency: { turn: { avg: 760 } } },
    outcome: ["not_interested", "connected"],
    postCallAnalysis: { "Promise to pay": false, "Objection raised": true, Sentiment: "negative" },
    contextVariables: { due_amount: 31200, customer_name: "M. Gupta", language: "en" },
  },
  {
    document_id: "Cs7uHjKdLp42oWb",
    beginTimestamp: daysAgo(20),
    type: "call",
    agent: "Debt Collection Pitch Agent",
    agentSlug: SLUG["Debt Collection Pitch Agent"],
    version: "v3_rerank_2024q4_hindi_pilot",
    callInfo: {
      type: "call",
      direction: "inbound",
      from: "+918887766554",
      to: "+919240938766",
      campaign: "CMP-9001",
      task: "TSK-4420",
      callSid: "CAabcd1234ef567890",
      attempt: 1,
      status: "completed",
      endReason: "completed",
    },
    duration: 389,
    stats: { turns: 31, latency: { turn: { avg: 700 } } },
    outcome: ["meeting_booked", "connected"],
    postCallAnalysis: { "Promise to pay": true, "Objection raised": true, Sentiment: "positive" },
    contextVariables: { due_amount: 54000, customer_name: "V. Rao", language: "hi" },
  },
  {
    document_id: "Nf4dRtYuQa67pLs",
    beginTimestamp: daysAgo(28),
    type: "web",
    agent: "Debt Collection Outbound Agent",
    agentSlug: SLUG["Debt Collection Outbound Agent"],
    version: "v1",
    callInfo: { type: "web", campaign: "CMP-7200", task: "TSK-2110", attempt: 1 },
    duration: 118,
    stats: { turns: 11, latency: { turn: { avg: 880 } } },
    outcome: ["unknown", "connected"],
    postCallAnalysis: { "Callback requested": true, Sentiment: "positive" },
    contextVariables: { due_amount: 6700, region: "South" },
  },
  {
    document_id: "Ya2bGhVcWx95qTd",
    beginTimestamp: daysAgo(40),
    type: "call",
    agent: "Careers_360 - Tech college predictor",
    agentSlug: SLUG["Careers_360 - Tech college predictor"],
    version: "v1",
    callInfo: {
      type: "call",
      direction: "outbound",
      from: "+919012345678",
      to: "+918123456709",
      campaign: "CMP-CAR-1",
      task: "TSK-CAR-20",
      callSid: "CAef90ab12cd34ef56",
      attempt: 1,
      status: "completed",
      endReason: "completed",
    },
    duration: 201,
    stats: { turns: 18, latency: { turn: { avg: 620 } } },
    outcome: ["connected"],
    postCallAnalysis: { "Lead quality": "medium", "Course interest": "ME" },
    contextVariables: { exam_score: 705, target_branch: "ME" },
  },
];

// Inject generated, schema-driven analysis/context values so every agent field
// is populated and filterable.
export const MOCK_CONVERSATIONS: Conversation[] = RAW_CONVERSATIONS.map((c) => {
  const def = agentDef(c.agent);
  return {
    ...c,
    postCallAnalysis: genRecord(def?.postCall ?? [], c.document_id),
    contextVariables: genRecord(def?.context ?? [], c.document_id),
  };
});
