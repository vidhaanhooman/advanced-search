"use client";

import { useReducer } from "react";
import {
  type Condition,
  type ConditionField,
  type ConversationType,
  type DatePreset,
  type FieldType,
  type FilterState,
  type MatchMode,
  type NumericFilter,
  type Operator,
  type SearchField,
  EMPTY_NUMERIC,
  INITIAL_FILTERS,
} from "./types";

export function defaultMode(vtype?: FieldType): MatchMode {
  if (vtype === "enum") return "specific";
  if (vtype === "number") return "number";
  if (vtype === "boolean") return "boolean";
  if (vtype === "date") return "date";
  return "text";
}

export type FilterAction =
  | { type: "RESET_ALL" }
  | { type: "CLEAR_CONDITIONS" }
  | { type: "SEARCH_FIELD"; field: SearchField }
  | { type: "SEARCH_QUERY"; query: string }
  | { type: "SET_TYPE"; value: ConversationType | null }
  | { type: "DATE_PRESET"; preset: DatePreset }
  | { type: "DATE_CUSTOM"; from: string | null; to: string | null }
  | { type: "ADD_CONDITION"; field: ConditionField; key?: string; vtype?: FieldType }
  | { type: "SET_CONDITIONS"; conditions: Condition[] }
  | { type: "REMOVE_CONDITION"; id: string }
  | { type: "UPDATE_CONDITION"; id: string; patch: Partial<Condition> }
  | { type: "TOGGLE_AGENT"; id: string; agent: string }
  | { type: "TOGGLE_AGENT_VERSION"; id: string; agent: string; version: string }
  | { type: "TOGGLE_VALUE"; id: string; value: string }
  | { type: "REMOVE_CHIP"; chipId: string };

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

function newCondition(field: ConditionField, key?: string, vtype?: FieldType): Condition {
  const id = key ? `${field}:${key}` : field;
  const base: Condition = { id, field, key, vtype };
  switch (field) {
    case "agent":
      return { ...base, agents: {} };
    case "channel":
    case "direction":
    case "outcome":
    case "callStatus":
    case "endReason":
      return { ...base, values: [] };
    case "duration":
    case "turns":
    case "turnLatency":
      // Range slider — open at both ends until dragged.
      return { ...base, num: { op: "between", value: null, value2: null } };
    case "attempt":
      // Count pills — "Any" until a pill is chosen.
      return { ...base, num: { ...EMPTY_NUMERIC } };
    default: {
      // Dynamic postCall/context — carrier depends on the chosen match mode.
      const mode = defaultMode(vtype);
      if (mode === "specific") return { ...base, mode, values: [] };
      if (mode === "number") return { ...base, mode, num: { op: "between", value: null, value2: null } };
      return { ...base, mode, text: "" };
    }
  }
}

function mapCond(
  conditions: Condition[],
  id: string,
  fn: (c: Condition) => Condition
): Condition[] {
  return conditions.map((c) => (c.id === id ? fn(c) : c));
}

export function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "RESET_ALL":
      return INITIAL_FILTERS;
    case "CLEAR_CONDITIONS":
      return { ...state, conditions: [] };

    case "SEARCH_FIELD":
      return { ...state, search: { ...state.search, field: action.field } };
    case "SEARCH_QUERY":
      return { ...state, search: { ...state.search, query: action.query } };

    case "SET_TYPE":
      return { ...state, type: action.value };

    case "DATE_PRESET":
      return {
        ...state,
        date:
          action.preset === "custom"
            ? { ...state.date, preset: "custom" }
            : { preset: action.preset, from: null, to: null },
      };
    case "DATE_CUSTOM":
      return {
        ...state,
        date: { preset: "custom", from: action.from, to: action.to },
      };

    case "ADD_CONDITION": {
      const id = action.key ? `${action.field}:${action.key}` : action.field;
      if (state.conditions.some((c) => c.id === id)) return state;
      return { ...state, conditions: [...state.conditions, newCondition(action.field, action.key, action.vtype)] };
    }
    case "SET_CONDITIONS":
      return { ...state, conditions: action.conditions };
    case "REMOVE_CONDITION":
      return { ...state, conditions: state.conditions.filter((c) => c.id !== action.id) };
    case "UPDATE_CONDITION":
      return { ...state, conditions: mapCond(state.conditions, action.id, (c) => ({ ...c, ...action.patch })) };

    case "TOGGLE_AGENT":
      return {
        ...state,
        conditions: mapCond(state.conditions, action.id, (c) => {
          const agents = { ...(c.agents ?? {}) };
          if (action.agent in agents) delete agents[action.agent];
          else agents[action.agent] = [];
          return { ...c, agents };
        }),
      };
    case "TOGGLE_AGENT_VERSION":
      return {
        ...state,
        conditions: mapCond(state.conditions, action.id, (c) => {
          const agents = { ...(c.agents ?? {}) };
          agents[action.agent] = toggle(agents[action.agent] ?? [], action.version);
          return { ...c, agents };
        }),
      };
    case "TOGGLE_VALUE":
      return {
        ...state,
        conditions: mapCond(state.conditions, action.id, (c) => ({
          ...c,
          values: toggle(c.values ?? [], action.value),
        })),
      };

    case "REMOVE_CHIP":
      return removeChip(state, action.chipId);

    default:
      return state;
  }
}

function removeChip(state: FilterState, chipId: string): FilterState {
  if (chipId === "search") return { ...state, search: { ...state.search, query: "" } };
  if (chipId === "type") return { ...state, type: null };
  if (chipId === "date") return { ...state, date: { preset: null, from: null, to: null } };
  if (chipId.startsWith("cond:")) {
    const id = chipId.slice("cond:".length);
    return { ...state, conditions: state.conditions.filter((c) => c.id !== id) };
  }
  return state;
}

export function useFilters() {
  return useReducer(filterReducer, INITIAL_FILTERS);
}

export const OPERATORS: Operator[] = [">", ">=", "<", "<=", "=", "between"];
