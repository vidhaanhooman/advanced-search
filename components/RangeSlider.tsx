"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NumericFilter } from "@/lib/types";

interface RangeSliderProps {
  min: number; // default domain min
  max: number; // default domain max
  step?: number;
  unit?: string;
  /** Optional data distribution (bucket counts across [min,max]). */
  histogram?: number[];
  /** Stored as op:"between"; value = lower (null = open), value2 = upper. */
  value: NumericFilter | null;
  onChange: (value: NumericFilter) => void;
}

/**
 * Price-range-style dual slider with white track + handles. Interactive: drag a
 * handle, click the track to jump the nearest handle, arrow/Home/End keys, a
 * live value tooltip, and Min/Max inputs. Reused by Call duration, Turns,
 * Turn latency.
 */
export function RangeSlider({ min, max, step = 1, unit, histogram, value, onChange }: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<"lo" | "hi" | null>(null);
  const [hover, setHover] = useState<"lo" | "hi" | null>(null);

  const lo = value?.value ?? min;
  const hi = value?.value2 ?? max;
  const span = max - min || 1;
  const pct = (v: number) => ((v - min) / span) * 100;

  const emit = useCallback(
    (nextLo: number, nextHi: number) => {
      const a = Math.min(Math.max(nextLo, min), nextHi);
      const b = Math.max(Math.min(nextHi, max), nextLo);
      onChange({
        op: "between",
        value: a <= min ? null : Math.round(a),
        value2: b >= max ? null : Math.round(b),
      });
    },
    [min, max, onChange]
  );

  const valFromX = useCallback(
    (clientX: number) => {
      const r = trackRef.current?.getBoundingClientRect();
      if (!r) return min;
      const ratio = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
      return Math.round((min + ratio * span) / step) * step;
    },
    [min, span, step]
  );

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const v = valFromX(e.clientX);
      if (drag === "lo") emit(v, hi);
      else emit(lo, v);
    };
    const up = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, lo, hi, emit, valFromX]);

  // Click anywhere on the track → move the nearest handle there, then drag it.
  function onTrackDown(e: React.PointerEvent) {
    const v = valFromX(e.clientX);
    const which = Math.abs(v - lo) <= Math.abs(v - hi) ? "lo" : "hi";
    if (which === "lo") emit(v, hi);
    else emit(lo, v);
    setDrag(which);
  }

  const onKey = (which: "lo" | "hi") => (e: React.KeyboardEvent) => {
    let nv: number | null = null;
    const v = which === "lo" ? lo : hi;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") nv = v + step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") nv = v - step;
    else if (e.key === "Home") nv = min;
    else if (e.key === "End") nv = max;
    if (nv === null) return;
    e.preventDefault();
    if (which === "lo") emit(nv, hi);
    else emit(lo, nv);
  };

  const maxCount = histogram ? Math.max(1, ...histogram) : 1;

  return (
    <div className="space-y-2">
      {histogram && (
        <div className="flex h-9 items-end gap-[2px]" aria-hidden>
          {histogram.map((count, i) => {
            const center = min + ((i + 0.5) / histogram.length) * span;
            const inRange = center >= lo && center <= hi;
            return (
              <div
                key={i}
                className={`flex-1 rounded-[1px] transition-colors ${
                  inRange ? "bg-white/55" : "bg-border-strong/70"
                }`}
                style={{ height: `${count ? Math.max(8, (count / maxCount) * 100) : 3}%` }}
              />
            );
          })}
        </div>
      )}
      <div
        ref={trackRef}
        onPointerDown={onTrackDown}
        className="relative h-5 cursor-pointer select-none"
      >
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border-strong" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-white"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        {(["lo", "hi"] as const).map((which) => {
          const v = which === "lo" ? lo : hi;
          const show = drag === which || hover === which;
          return (
            <button
              key={which}
              type="button"
              role="slider"
              aria-label={which === "lo" ? "Minimum" : "Maximum"}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={Math.round(v)}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                setDrag(which);
              }}
              onPointerEnter={() => setHover(which)}
              onPointerLeave={() => setHover(null)}
              onKeyDown={onKey(which)}
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-neutral-900 shadow-md shadow-black/40 hover:scale-110 focus-visible:scale-110"
              style={{ left: `${pct(v)}%` }}
            >
              {show && (
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border-strong bg-surface-2 px-2 py-0.5 text-[11px] text-text shadow-lg">
                  {Math.round(v)}
                  {unit ? ` ${unit}` : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <NumBox
          value={value?.value ?? null}
          placeholder={String(min)}
          unit={unit}
          onChange={(n) => emit(n ?? min, hi)}
        />
        <span className="text-text-muted">—</span>
        <NumBox
          value={value?.value2 ?? null}
          placeholder={String(max)}
          unit={unit}
          onChange={(n) => emit(lo, n ?? max)}
        />
      </div>
    </div>
  );
}

function NumBox({
  value,
  placeholder,
  unit,
  onChange,
}: {
  value: number | null;
  placeholder: string;
  unit?: string;
  onChange: (n: number | null) => void;
}) {
  return (
    <div className="flex h-10 flex-1 items-center gap-1 rounded-lg border border-border-strong bg-surface-2 px-3 focus-within:border-white">
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-dim"
      />
      {unit && <span className="text-xs text-text-muted">{unit}</span>}
    </div>
  );
}
