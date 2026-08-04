/**
 * Pointer and scroll tracking for the pearl material.
 *
 * Both trackers store a raw target from a passive listener and expose a damped
 * value that the render loop advances once per frame. Nothing here touches
 * React state, so pointer and scroll activity never trigger a re-render, and
 * the damping is what keeps the material trailing the pointer instead of
 * snapping to it.
 */

/**
 * Frame-rate independent exponential smoothing.
 * `rate` is roughly "how many e-folds per second".
 */
export function damp(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export type PointerTracker = {
  /** Damped pointer, 0..1 in surface space, y up. */
  x: number;
  y: number;
  /** Damped presence, 0 when the pointer is away or idle. */
  amt: number;
  update(dt: number): void;
  dispose(): void;
};

/**
 * Listens on the window (never on the canvas), so the decorative layer can stay
 * `pointer-events: none` and never intercept clicks, focus, or text selection.
 */
export function createPointerTracker(getRect: () => DOMRect | null, enabled: boolean): PointerTracker {
  const state = {
    x: 0.5,
    y: 0.5,
    amt: 0,
    targetX: 0.5,
    targetY: 0.5,
    targetAmt: 0,
    update(dt: number) {
      // Position damps faster than presence, so the material eases in and out.
      this.x = damp(this.x, this.targetX, 2.4, dt);
      this.y = damp(this.y, this.targetY, 2.4, dt);
      this.amt = damp(this.amt, this.targetAmt, 1.3, dt);
    },
    dispose() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
    },
  };

  function onMove(event: PointerEvent) {
    // Touch and pen never drive the deformation — it reads as lag, not response.
    if (event.pointerType !== "mouse") return;
    const rect = getRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    state.targetX = (event.clientX - rect.left) / rect.width;
    state.targetY = 1 - (event.clientY - rect.top) / rect.height;
    // Only claim presence while the pointer is actually over the surface.
    const inside =
      state.targetX > -0.35 && state.targetX < 1.35 && state.targetY > -0.35 && state.targetY < 1.35;
    state.targetAmt = inside ? 1 : 0;
  }

  function onLeave() {
    state.targetAmt = 0;
  }

  if (enabled) {
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
  } else {
    state.dispose = () => undefined;
  }

  return state;
}

export type ScrollTracker = {
  /** Smoothed scroll travel measured in viewport heights. */
  flow: number;
  /** Smoothed 0..1 document progress. */
  progress: number;
  /** Smoothed, clamped scroll velocity in the -1..1 range. */
  velocity: number;
  update(dt: number): void;
  dispose(): void;
};

/**
 * Reads `scrollY` inside the render loop rather than from a scroll handler, so
 * there is no listener contending with the compositor. The document height is
 * cached and only refreshed on resize, since reading it forces layout.
 */
export function createScrollTracker(enabled: boolean): ScrollTracker {
  let maxScroll = 1;
  let last = typeof window === "undefined" ? 0 : window.scrollY;

  const measure = () => {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  };

  const state = {
    flow: 0,
    progress: 0,
    velocity: 0,
    update(dt: number) {
      if (!enabled) return;
      const y = window.scrollY;
      const vh = Math.max(1, window.innerHeight);
      const raw = y / vh;
      // Instantaneous velocity in viewport heights per second, softly clamped.
      const instant = dt > 0 ? ((y - last) / vh) / dt : 0;
      last = y;

      this.flow = damp(this.flow, raw, 3.2, dt);
      this.progress = damp(this.progress, Math.min(1, y / maxScroll), 3.2, dt);
      this.velocity = damp(this.velocity, Math.max(-1, Math.min(1, instant * 0.5)), 2.6, dt);
    },
    dispose() {
      window.removeEventListener("resize", measure);
    },
  };

  if (enabled && typeof window !== "undefined") {
    measure();
    // Prime so the first frame is not a jump from zero on a restored scroll position.
    state.flow = window.scrollY / Math.max(1, window.innerHeight);
    state.progress = Math.min(1, window.scrollY / maxScroll);
    window.addEventListener("resize", measure);
  } else {
    state.dispose = () => undefined;
  }

  return state;
}
