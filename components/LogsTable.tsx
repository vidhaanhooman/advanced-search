"use client";

import { Globe, PhoneIncoming, PhoneOutgoing, Phone, Copy } from "lucide-react";
import type { Conversation } from "@/lib/types";
import { OUTCOME_DOT } from "@/lib/display";

function TypeCell({ c }: { c: Conversation }) {
  if (c.type === "web")
    return (
      <span className="inline-flex items-center gap-1.5 text-sky-400">
        <Globe size={14} /> Web
      </span>
    );
  const dir = c.callInfo.direction;
  const Icon = dir === "inbound" ? PhoneIncoming : dir === "outbound" ? PhoneOutgoing : Phone;
  return (
    <span className="inline-flex items-center gap-1.5 text-emerald-400">
      <Icon size={14} />
      {dir ? dir[0].toUpperCase() + dir.slice(1) : "Call"}
    </span>
  );
}

function endpoint(c: Conversation, side: "from" | "to"): string {
  const v = c.callInfo[side];
  if (v) return v;
  if (side === "from") return c.type === "web" ? "web_session" : "—";
  return "—";
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  // Display in UTC so the shown time matches the UTC-based date/time filtering.
  const date = d.toLocaleDateString("en-GB", { timeZone: "UTC" }).replace(/\//g, "-");
  const time = d.toLocaleTimeString("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} ${time}`;
}

export function LogsTable({ rows }: { rows: Conversation[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border scroll-thin">
      <table className="w-full min-w-[1000px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-muted">
            <Th>Conversation</Th>
            <Th>When</Th>
            <Th>Type</Th>
            <Th>Agent</Th>
            <Th>From</Th>
            <Th>To</Th>
            <Th className="text-right">Duration (s)</Th>
            <Th className="text-right">Turns</Th>
            <Th>Outcome / Flags</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.document_id} className="border-b border-border/50 hover:bg-surface/70">
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2 font-mono text-xs text-text" title={c.document_id}>
                  <Copy size={13} className="shrink-0 text-text-muted" />
                  {c.document_id.length > 13 ? c.document_id.slice(0, 13) + "…" : c.document_id}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-text-dim">{fmtWhen(c.beginTimestamp)}</td>
              <td className="px-4 py-3">
                <TypeCell c={c} />
              </td>
              <td className="px-4 py-3">
                <div className="leading-tight">
                  <div className="text-text">{c.agent}</div>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
                    <Copy size={11} className="shrink-0" />
                    {c.agentSlug}_{c.version}
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-dim">
                {endpoint(c, "from")}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-dim">
                {endpoint(c, "to")}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-text-dim">
                {c.duration || "—"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-text-dim">{c.stats.turns}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {c.outcome.map((o) => (
                    <span
                      key={o}
                      className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-text-dim"
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${OUTCOME_DOT[o]}`} />
                      {o}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-14 text-center text-text-muted">
                No conversations match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>;
}
