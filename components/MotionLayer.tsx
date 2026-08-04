"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function MotionLayer() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const reveal = (node: HTMLElement) => node.classList.add("is-visible");

    if (reduceMotion) {
      // Reveal everything now, and anything mounted later (async content), immediately.
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach(reveal);
      const mo = new MutationObserver((records) => {
        records.forEach((rec) =>
          rec.addedNodes.forEach((n) => {
            if (!(n instanceof HTMLElement)) return;
            if (n.matches("[data-reveal]")) reveal(n);
            n.querySelectorAll<HTMLElement>("[data-reveal]").forEach(reveal);
          })
        );
      });
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7%" }
    );

    // Register a reveal node. `seq` staggers the entrance delay; nodes that mount
    // later (after an async fetch) register the same way, so content never sticks at opacity:0.
    // Anything already in view reveals immediately — observing an in-viewport node in the same
    // frame it mounts can yield an initial isIntersecting:false that never re-fires without a
    // scroll, leaving it stuck. Only below-fold nodes are deferred to the observer.
    // The "already registered" guard must live with the observer, not on the DOM node:
    // StrictMode (and any re-run of this effect) disconnects the old observer, and a flag
    // persisted on the element would make every node skip re-registration and stay at opacity:0.
    const bound = new WeakSet<HTMLElement>();
    let seq = 0;
    const register = (node: HTMLElement) => {
      if (bound.has(node)) return;
      bound.add(node);
      node.style.setProperty("--reveal-delay", `${Math.min(seq % 4, 3) * 90}ms`);
      seq += 1;
      if (node.getBoundingClientRect().top < window.innerHeight * 0.95) reveal(node);
      else observer.observe(node);
    };

    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach(register);

    // Catch data-reveal content that renders after data loads.
    const mutations = new MutationObserver((records) => {
      records.forEach((rec) =>
        rec.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.matches("[data-reveal]")) register(n);
          n.querySelectorAll<HTMLElement>("[data-reveal]").forEach(register);
        })
      );
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      root.style.setProperty("--scroll-progress", progress.toFixed(4));
      document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((node) => {
        const speed = Number(node.dataset.parallax || 0.08);
        const rect = node.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
        node.style.setProperty("--parallax-y", `${offset.toFixed(1)}px`);
      });
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScroll);
    };

    updateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return <div className="scroll-progress" aria-hidden />;
}
