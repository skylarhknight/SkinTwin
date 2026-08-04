"use client";

import { useEffect, useRef, useState } from "react";
import { createPointerTracker, createScrollTracker } from "./pearlInput";
import { detectEnvironment } from "./pearlQuality";
import { PearlRenderer } from "./pearlRenderer";
import type { PearlMode } from "./pearlShader";

export type PearlSurfaceProps = {
  mode: PearlMode;
  /** Deterministic phase offsets — see `pearlVariantForRoute`. */
  seed: [number, number, number];
  /** Pastel undertone. */
  tint: [number, number, number];
  /** Overall material presence. 1 is the calm page default. */
  intensity?: number;
  /** 0..1 — how strongly the centre column is kept free of highlights. */
  calm?: number;
  /** Global fade of the whole surface. */
  opacity?: number;
  /** Pointer deformation. Ignored on coarse pointers and under reduced motion. */
  interactive?: boolean;
  /** Scroll-driven parallax and flow. */
  scrollDriven?: boolean;
  className?: string;
};

/**
 * The shared rendering shell: canvas lifecycle, quality tier, input trackers,
 * visibility gating, and the CSS fallback. Both `PearlLiquidBackground` and
 * `PearlLiquidFooter` are thin compositions over this.
 *
 * The element is `aria-hidden` and `pointer-events: none`; pointer coordinates
 * arrive from a passive window listener, so nothing here can swallow a click,
 * a focus ring, or a text selection.
 */
export function PearlSurface({
  mode,
  seed,
  tint,
  intensity = 1,
  calm = 0,
  opacity = 1,
  interactive = true,
  scrollDriven = true,
  className = "",
}: PearlSurfaceProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState(false);

  // Serialised so the effect re-runs on an actual variant change, not on the
  // new array identity a parent creates every render.
  const seedKey = seed.join(",");
  const tintKey = tint.join(",");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // The canvas is created per effect run rather than rendered by React:
    // teardown calls WEBGL_lose_context, which permanently poisons that canvas
    // element, so a remount (React strict mode, a route change) must get a
    // fresh one.
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    host.appendChild(canvas);

    const env = detectEnvironment();
    const renderer = PearlRenderer.create(canvas, mode, env.quality);
    if (!renderer) {
      setFallback(true);
      canvas.remove();
      return;
    }
    setFallback(false);

    renderer.setStatic({
      seed: seedKey.split(",").map(Number) as [number, number, number],
      tint: tintKey.split(",").map(Number) as [number, number, number],
      intensity,
      calm,
      opacity,
    });

    const usePointer = interactive && env.pointerCapable && !env.reducedMotion;
    const useScroll = scrollDriven && !env.reducedMotion;
    const pointer = createPointerTracker(() => hostRef.current?.getBoundingClientRect() ?? null, usePointer);
    const scroll = createScrollTracker(useScroll);

    const ratio = Math.min(window.devicePixelRatio || 1, env.maxDpr) * env.resolutionScale;
    let width = 0;
    let height = 0;

    const applySize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      renderer.resize(width, height, ratio);
    };

    /** Under reduced motion the composition is frozen at a hand-picked phase. */
    const drawStatic = () => {
      applySize();
      renderer.render({
        time: 42,
        pointerX: 0.5,
        pointerY: 0.55,
        pointerAmt: 0,
        flow: 0,
        progress: 0,
        velocity: 0,
      });
    };

    if (env.reducedMotion) {
      drawStatic();
      const observer = new ResizeObserver(drawStatic);
      observer.observe(host);
      return () => {
        observer.disconnect();
        pointer.dispose();
        scroll.dispose();
        renderer.dispose();
        canvas.remove();
      };
    }

    applySize();

    let raf = 0;
    let running = false;
    let visible = true;
    let last = performance.now();
    let elapsed = 0;
    let lastDraw = 0;

    // Paint one frame up front. A surface mounted in a hidden or offscreen
    // state never starts the loop, and must not be left blank until it is
    // scrolled into view.
    renderer.render({
      time: 0,
      pointerX: pointer.x,
      pointerY: pointer.y,
      pointerAmt: 0,
      flow: scroll.flow,
      progress: scroll.progress,
      velocity: 0,
    });

    const frame = (now: number) => {
      // Clamp so a backgrounded tab or a long task cannot jump the animation.
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      elapsed += dt;

      pointer.update(dt);
      scroll.update(dt);

      if (env.frameBudget === 0 || now - lastDraw >= env.frameBudget) {
        lastDraw = now;
        renderer.render({
          time: elapsed,
          pointerX: pointer.x,
          pointerY: pointer.y,
          pointerAmt: pointer.amt,
          flow: scroll.flow,
          progress: scroll.progress,
          velocity: scroll.velocity,
        });
      }

      if (running) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || !visible || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    // Only render while the surface is actually on screen.
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) start();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(host);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    const resizeObserver = new ResizeObserver(() => {
      applySize();
      // Resizing clears the drawing buffer, so a paused surface has to repaint.
      if (!running) {
        renderer.render({
          time: elapsed,
          pointerX: pointer.x,
          pointerY: pointer.y,
          pointerAmt: pointer.amt,
          flow: scroll.flow,
          progress: scroll.progress,
          velocity: 0,
        });
      }
    });
    resizeObserver.observe(host);

    start();

    return () => {
      stop();
      io.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      pointer.dispose();
      scroll.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [mode, seedKey, tintKey, intensity, calm, opacity, interactive, scrollDriven]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={`pointer-events-none overflow-hidden ${className || "absolute inset-0"}`}
    >
      {fallback ? (
        // No WebGL: a still pearl composition in the same palette.
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(60rem 40rem at 12% 8%, rgba(255,246,248,.95), transparent 62%)," +
              "radial-gradient(52rem 38rem at 88% 22%, rgba(244,247,255,.9), transparent 60%)," +
              "radial-gradient(46rem 46rem at 62% 96%, rgba(250,244,255,.92), transparent 64%)," +
              "linear-gradient(160deg, #fdfbf8 0%, #f8f5f6 45%, #fbf8fa 100%)",
          }}
        />
      ) : null}
    </div>
  );
}
