"use client";

import { useEffect, useRef } from "react";

type Blob = {
  x: number;
  y: number;
  r: number;
  color: string;
  dx: number;
  dy: number;
  phase: number;
  drift: number;
};

const PALETTES: Record<string, string[]> = {
  // Luminous skincare neutrals: peach, lilac, sage, blush, champagne
  skin: ["#f4c9a8", "#c9b8de", "#9db39a", "#e8a9a0", "#e9c9a0"],
  plum: ["#c9b8de", "#a06a7e", "#e8a9a0", "#d9b892"],
};

/**
 * Dependency-free animated "aurora" background: soft drifting radial-gradient
 * blobs that blend into a dewy, luminous flow field. Pauses when offscreen or
 * when the tab is hidden, and renders a single static frame under
 * prefers-reduced-motion.
 */
export function AuroraCanvas({
  className = "",
  palette = "skin",
  intensity = 1,
  grain = false,
}: {
  className?: string;
  palette?: keyof typeof PALETTES | string;
  intensity?: number;
  grain?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = PALETTES[palette] ?? PALETTES.skin;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let blobs: Blob[] = [];
    let raf = 0;
    let visible = true;
    let running = false;

    const seed = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(4, Math.round((width * height) / 150000));
      blobs = Array.from({ length: count }, (_, i) => {
        const base = Math.min(width, height);
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: base * (0.42 + Math.random() * 0.5) * intensity,
          color: colors[i % colors.length],
          dx: (Math.random() - 0.5) * 0.14,
          dy: (Math.random() - 0.5) * 0.14,
          phase: Math.random() * Math.PI * 2,
          drift: 0.4 + Math.random() * 0.6,
        };
      });
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "source-over";
      // soft base wash
      ctx.fillStyle = "rgba(250, 246, 241, 0.35)";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "multiply";

      for (const b of blobs) {
        const wobbleX = Math.sin(t * 0.0002 * b.drift + b.phase) * 40;
        const wobbleY = Math.cos(t * 0.00018 * b.drift + b.phase) * 40;
        const x = b.x + wobbleX;
        const y = b.y + wobbleY;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        grad.addColorStop(0, hexToRgba(b.color, 0.5));
        grad.addColorStop(0.55, hexToRgba(b.color, 0.18));
        grad.addColorStop(1, hexToRgba(b.color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const step = (t: number) => {
      for (const b of blobs) {
        b.x += b.dx;
        b.y += b.dy;
        const m = b.r * 0.4;
        if (b.x < -m) b.x = width + m;
        if (b.x > width + m) b.x = -m;
        if (b.y < -m) b.y = height + m;
        if (b.y > height + m) b.y = -m;
      }
      draw(t);
      if (running) raf = requestAnimationFrame(step);
    };

    const start = () => {
      if (running || reduceMotion || !visible) return;
      running = true;
      raf = requestAnimationFrame(step);
    };

    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onResize = () => {
      seed();
      draw(performance.now());
    };

    seed();
    draw(performance.now());

    if (reduceMotion) {
      // one static frame only
      return () => undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) start();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    start();

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [palette, intensity]);

  return (
    <div className={`pointer-events-none overflow-hidden ${className || "absolute inset-0"}`} aria-hidden>
      <canvas ref={canvasRef} className="h-full w-full" />
      {grain ? (
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      ) : null}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
