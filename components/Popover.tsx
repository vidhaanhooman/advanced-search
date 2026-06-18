"use client";

import { useEffect, useRef, useState } from "react";

interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (props: { close: () => void }) => React.ReactNode;
  align?: "left" | "right";
  width?: number;
}

/**
 * Minimal accessible popover: click trigger to toggle, click-outside / Escape
 * to close. Used by the toolbar dropdown controls (Agent, Duration, Date,
 * Search field, MultiSelect).
 */
export function Popover({ trigger, children, align = "left", width }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className="absolute z-30 mt-1.5 rounded-lg border border-border-strong bg-surface shadow-xl shadow-black/40"
          style={{
            width: width ?? 260,
            [align]: 0,
          }}
          role="dialog"
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}
