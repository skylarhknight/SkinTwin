"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
};

/** Drag handle compares "current scan" vs simulated future. Pointer + keyboard accessible. */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Today",
  afterLabel = "Future",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(50);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, pct)));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      updateFromClientX(e.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [updateFromClientX]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-square w-full overflow-hidden rounded-3xl bg-sf-blue-soft select-none"
      onPointerDown={(e) => {
        draggingRef.current = true;
        updateFromClientX(e.clientX);
      }}
    >
      <img
        src={afterSrc}
        alt="Simulated future"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeSrc}
          alt="Current scan"
          className="h-full w-full object-cover"
          style={{ width: containerRef.current?.clientWidth ?? "100%", maxWidth: "none" }}
          draggable={false}
        />
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
        {afterLabel}
      </span>

      <div
        className="pointer-events-none absolute inset-y-0 z-10"
        style={{ left: `calc(${position}% - 1px)` }}
      >
        <div className="h-full w-[2px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.18)]" />
      </div>

      <div
        className="absolute top-1/2 z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-white/80 bg-white text-sf-blue-deep shadow-sf"
        style={{ left: `${position}%` }}
        role="slider"
        aria-label="Compare current and future"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 4));
          if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 4));
          if (e.key === "Home") setPosition(0);
          if (e.key === "End") setPosition(100);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          draggingRef.current = true;
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M9 18l-6-6 6-6 1.41 1.41L5.83 12l4.58 4.59L9 18zm6-12l6 6-6 6-1.41-1.41L18.17 12l-4.58-4.59L15 6z"
          />
        </svg>
      </div>
    </div>
  );
}
