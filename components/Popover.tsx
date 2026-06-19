"use client";

import { useEffect, useRef, useState } from "react";

interface PopoverProps {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (props: { close: () => void }) => React.ReactNode;
  align?: "left" | "right";
  width?: number;
  /** When true, click-outside and Escape do NOT close the popover. */
  disableClose?: boolean;
  /** When true, lock body scroll and render an invisible overlay behind the popover. */
  blockBackground?: boolean;
}

/**
 * Minimal accessible popover: click trigger to toggle, click-outside / Escape
 * to close. Used by the toolbar dropdown controls (Agent, Duration, Date,
 * Search field, MultiSelect). With blockBackground, an invisible overlay
 * catches outside clicks and the body's scroll is locked.
 */
export function Popover({ trigger, children, align = "left", width, disableClose, blockBackground }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || disableClose) return;
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
  }, [open, disableClose]);

  // Lock body scroll while the popover is open (optional).
  useEffect(() => {
    if (!open || !blockBackground) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, blockBackground]);

  return (
    <div className="relative inline-block" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && blockBackground && (
        // Invisible overlay (opacity-0). Catches clicks/scroll outside the popover
        // so the underlying table doesn't scroll. Closing is handled by the
        // existing mousedown listener above (or Escape).
        <div className="fixed inset-0 z-20" aria-hidden onClick={() => !disableClose && setOpen(false)} />
      )}
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
