"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

const VIDEO_URL =
  "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__2/-t-e-x-t_-t-o_-v-i-d-e-o-f62632d7-7495-4d5d-ab8a-d2e8629d3084.mp4?Expires=2100695004&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=Zc-q5fAgEmIk2TD2fpB2Up2~n78Mot1HF2XCwYnrCLnlwlslRUlDwVn1zSnDq4duFhZpEEZ2X3c2RYlJT06V3UfJ4NFxcfYC8O58AQ5nwPXUWI~Lkgkc6JinSBMha9lJWyHkf7lp1MKkYpG9DwGfGqHHLRpEWJBeiGGtUhZmCkCBia8A27y3a0NYRYYiHD3MkPU1cvccrxDuSI2UiIotTtBqdNDr20~xAWYE2E0U4HCXXzX5Xvns~JGnit9ONUVmnH2cuXTI~7AExho-QQpg07VXckepe~t84ajrQgdJe4RaIxRBV9mi3wYBqGL~BOczjScZmu2xdtqhr4P7CxCi4A__";

/** Decorative glyph paths drawn inside the cursor ring / corner mark (48x48 space). */
const GLYPHS = [
  "M23 13h2v9h9v2h-9v9h-2v-9h-9v-2h9z", // plus
  "M24 12l3 9 9 3-9 3-3 9-3-9-9-3 9-3z", // 4-point star
  "M24 13l8 18H16z", // triangle
  "M24 12l6 6-6 6-6-6zm0 12l6 6-6 6-6-6z", // stacked diamonds
  "M18 33l9-18h1.6l-9 18zM24 33l9-18h1.6l-9 18z", // double slash
  "M14 24a10 10 0 0 0 20 0 10 10 0 0 1-20 0z", // crescent
];

type Side = "left" | "right";

export default function ArchivePage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const leftVideoRef = useRef<HTMLVideoElement | null>(null);
  const rightVideoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);

  const mouseXRef = useRef(0);
  const activeSideRef = useRef<Side>("right");
  const loadedRef = useRef({ left: false, right: false });

  const [videosReady, setVideosReady] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [glyphIndex, setGlyphIndex] = useState(0);
  const [cornerGlyph, setCornerGlyph] = useState(2);

  // --- environment detection ---------------------------------------------
  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    const desktop = !touch && window.innerWidth >= 1024;
    setIsDesktop(desktop);
  }, []);

  // --- video loading + priming -------------------------------------------
  useEffect(() => {
    const left = leftVideoRef.current;
    const right = rightVideoRef.current;
    if (!left || !right) return;

    [left, right].forEach((v) => {
      v.muted = true;
      (v as HTMLVideoElement & { playsInline: boolean }).playsInline = true;
    });

    const markReady = () => {
      if (loadedRef.current.left && loadedRef.current.right) setVideosReady(true);
    };
    const onLeft = () => {
      loadedRef.current.left = true;
      // prime a decoded frame then park at 0 for scrubbing
      left.play().then(() => { left.pause(); left.currentTime = 0; }).catch(() => {});
      markReady();
    };
    const onRight = () => {
      loadedRef.current.right = true;
      right.play().then(() => { right.pause(); right.currentTime = 0; }).catch(() => {});
      markReady();
    };

    left.addEventListener("loadeddata", onLeft);
    right.addEventListener("loadeddata", onRight);
    // Fallback so the canvas never stays invisible if events are flaky/cached
    const fallback = window.setTimeout(() => setVideosReady(true), 2500);

    return () => {
      left.removeEventListener("loadeddata", onLeft);
      right.removeEventListener("loadeddata", onRight);
      window.clearTimeout(fallback);
    };
  }, []);

  // --- desktop: custom cursor + cursor-driven video scrub ----------------
  useEffect(() => {
    if (!isDesktop) return;
    const left = leftVideoRef.current;
    const right = rightVideoRef.current;
    const cursor = cursorRef.current;
    if (!left || !right) return;

    mouseXRef.current = window.innerWidth / 2;

    const onMove = (e: MouseEvent) => {
      mouseXRef.current = e.clientX;
      if (cursor) {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const show = (side: Side) => {
      left.style.display = side === "left" ? "block" : "none";
      right.style.display = side === "right" ? "block" : "none";
    };

    let raf = 0;
    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    const tick = () => {
      const width = window.innerWidth;
      const center = width / 2;
      const dead = Math.max(30, width * 0.05);
      const x = mouseXRef.current;

      if (Math.abs(x - center) <= dead) {
        // dead zone: keep the currently active video parked on its first frame
        const v = activeSideRef.current === "left" ? left : right;
        if (!v.seeking) v.currentTime = 0;
      } else if (x < center - dead) {
        // left of dead zone -> show RIGHT video, scrub toward the left edge
        if (activeSideRef.current !== "right") { activeSideRef.current = "right"; show("right"); }
        const range = center - dead;
        const progress = clamp((center - dead - x) / range);
        if (right.duration && !right.seeking) right.currentTime = progress * right.duration;
      } else {
        // right of dead zone -> show LEFT video, scrub toward the right edge
        if (activeSideRef.current !== "left") { activeSideRef.current = "left"; show("left"); }
        const range = width - (center + dead);
        const progress = clamp((x - center - dead) / range);
        if (left.duration && !left.seeking) left.currentTime = progress * left.duration;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [isDesktop]);

  // --- touch: alternate autoplay -----------------------------------------
  useEffect(() => {
    if (isDesktop) return;
    const left = leftVideoRef.current;
    const right = rightVideoRef.current;
    if (!left || !right) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const show = (side: Side) => {
      left.style.display = side === "left" ? "block" : "none";
      right.style.display = side === "right" ? "block" : "none";
    };
    const playLeft = () => { show("left"); left.currentTime = 0; left.play().catch(() => {}); };
    const playRight = () => { show("right"); right.currentTime = 0; right.play().catch(() => {}); };

    left.addEventListener("ended", playRight);
    right.addEventListener("ended", playLeft);
    // kick off with the left video
    playLeft();

    return () => {
      left.removeEventListener("ended", playRight);
      right.removeEventListener("ended", playLeft);
    };
  }, [isDesktop]);

  // --- scroll: hide video past first viewport + randomize glyphs ---------
  useEffect(() => {
    let lastGlyph = 0;
    const onScroll = () => {
      const past = window.scrollY > window.innerHeight;
      if (canvasRef.current) canvasRef.current.style.visibility = past ? "hidden" : "visible";
      const now = Date.now();
      if (now - lastGlyph > 80) {
        lastGlyph = now;
        setGlyphIndex(Math.floor(Math.random() * GLYPHS.length));
        setCornerGlyph(Math.floor(Math.random() * GLYPHS.length));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // --- GSAP: scroll-spacer height + hero-exit parallax -------------------
  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const spacer = rootRef.current;
      const overlay = overlayRef.current;
      if (!spacer) return;
      gsap.set(spacer, { height: () => window.innerHeight * 2.2 });
      if (overlay) {
        gsap.to(overlay, {
          yPercent: -6,
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: spacer,
            start: "top top",
            end: () => `+=${window.innerHeight}`,
            scrub: true,
          },
        });
      }
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("resize", refresh);
      return () => window.removeEventListener("resize", refresh);
    },
    { scope: rootRef }
  );

  return (
    <div
      ref={rootRef}
      id="scroll-spacer"
      className="relative select-none bg-white"
      style={{ height: "220vh", cursor: isDesktop ? "none" : "auto" }}
    >
      {/* 1G. Video container */}
      <div
        ref={canvasRef}
        id="main-canvas"
        className="pointer-events-none fixed left-0 top-[220px] z-0 h-[calc(100vh-220px)] w-screen overflow-hidden md:inset-0 md:top-0 md:h-full md:w-full"
        style={{ opacity: videosReady ? 1 : 0, transition: "opacity 0.3s ease" }}
      >
        <video
          ref={leftVideoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ display: "none" }}
          src={VIDEO_URL}
          muted
          playsInline
          preload="auto"
        />
        <video
          ref={rightVideoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ display: "block" }}
          src={VIDEO_URL}
          muted
          playsInline
          preload="auto"
        />
      </div>

      {/* Overlaid UI — fixed, non-interactive, blends against any background */}
      <div
        ref={overlayRef}
        className="pointer-events-none fixed inset-0 z-10 text-white"
        style={{ mixBlendMode: "exclusion" }}
      >
        <div className="flex h-full flex-col justify-between p-5 md:p-8">
          {/* top row: logo + nav */}
          <div className="flex items-start justify-between">
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0, ease: [0.2, 0.7, 0.2, 1] }}
              className="leading-tight"
            >
              <p className="text-sm font-semibold tracking-[0.3em]">SIGNAL</p>
              <p className="mt-1 text-[11px] tracking-[0.28em] opacity-80">ARCHIVE · VOL.01</p>
            </motion.div>

            <motion.nav
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
              className="hidden gap-6 text-[11px] font-medium uppercase tracking-[0.22em] sm:flex"
            >
              <span>Index</span>
              <span>Motion</span>
              <span>Information</span>
              <span>Contact ↗</span>
            </motion.nav>
          </div>

          {/* center hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mx-auto text-center text-[11px] uppercase tracking-[0.4em]"
          >
            ( move · scrub · scroll )
          </motion.p>

          {/* bottom row: caption + product info */}
          <div className="flex items-end justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              className="max-w-xs"
            >
              <p className="text-[11px] uppercase tracking-[0.24em] opacity-80">F/W 26 — Study N°014</p>
              <p className="mt-2 text-sm leading-relaxed tracking-wide">
                {isDesktop
                  ? "Move your cursor left and right to scrub the archive."
                  : "An archive of motion, played back frame by frame."}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
              className="text-right text-[11px] uppercase leading-relaxed tracking-[0.22em]"
            >
              <p>Text-to-Video</p>
              <p className="opacity-80">Run 62632</p>
              <p className="opacity-80">00:00 — 00:∞ · 2026</p>
            </motion.div>
          </div>
        </div>

        {/* corner decorative mark (randomizes on scroll) */}
        <svg
          className="absolute bottom-5 left-1/2 h-8 w-8 -translate-x-1/2 md:bottom-8"
          width="32"
          height="32"
          viewBox="0 0 48 48"
          aria-hidden
        >
          <circle cx="24" cy="24" r="22.75" fill="none" stroke="white" strokeWidth="2.5" />
          <path d={GLYPHS[cornerGlyph]} fill="white" />
        </svg>
      </div>

      {/* 1A. Custom cursor (desktop only) */}
      {isDesktop ? (
        <div
          ref={cursorRef}
          className="pointer-events-none fixed z-50"
          style={{ left: 0, top: 0, transform: "translate(-50%, -50%)", mixBlendMode: "exclusion" }}
          aria-hidden
        >
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22.75" fill="none" stroke="white" strokeWidth="2.5" />
            <path d={GLYPHS[glyphIndex]} fill="white" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}
