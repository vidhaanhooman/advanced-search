"use client";

import { useState } from "react";
import {
  Globe, Bot, Headphones, FlaskConical, BadgeCheck, Wrench, Database, Languages,
  Hash, BellOff, Megaphone, MessagesSquare, FileText, AlertTriangle, FileBarChart,
  BookOpen, ChevronsUpDown, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { label: string; icon: React.ComponentType<{ size?: number }>; badge?: string; active?: boolean };

const NAV: { group: string; items: Item[] }[] = [
  {
    group: "Build",
    items: [
      { label: "Overview", icon: Globe },
      { label: "Agents", icon: Bot },
      { label: "Test Agents", icon: Headphones },
      { label: "Simulation", icon: FlaskConical },
      { label: "QA", icon: BadgeCheck },
      { label: "Tools", icon: Wrench },
      { label: "Library", icon: Database },
      { label: "Pronunciation", icon: Languages },
      { label: "Numbers", icon: Hash },
      { label: "DND", icon: BellOff, badge: "Beta" },
    ],
  },
  { group: "Call", items: [{ label: "Campaigns", icon: Megaphone }] },
  {
    group: "Logs",
    items: [
      { label: "Conversation Logs", icon: MessagesSquare, active: true },
      { label: "Execution Logs", icon: FileText },
    ],
  },
  {
    group: "Monitor",
    items: [
      { label: "Alerts", icon: AlertTriangle },
      { label: "Reports", icon: FileBarChart },
      { label: "Docs", icon: BookOpen },
    ],
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <aside className="flex h-screen w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface/40 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/20 text-xs font-semibold text-rose-300">HO</div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          className="mt-2 flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <PanelLeftOpen size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface/40">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/20 text-sm font-semibold text-rose-300">HO</div>
        <span className="flex-1 truncate text-sm font-semibold text-text">HoomanLabs</span>
        <ChevronsUpDown size={15} className="text-text-muted" />
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Collapse sidebar"
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4 scroll-thin">
        {NAV.map((g) => (
          <div key={g.group} className="mb-3">
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{g.group}</p>
            {g.items.map((it) => (
              <a
                key={it.label}
                href="#"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  it.active ? "bg-surface-2 text-text" : "text-text-dim hover:bg-surface-2/60 hover:text-text"
                )}
              >
                <it.icon size={16} />
                <span className="flex-1 truncate">{it.label}</span>
                {it.badge && (
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">{it.badge}</span>
                )}
              </a>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
