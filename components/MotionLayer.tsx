"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function MotionLayer() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (reduceMotion) {
      revealNodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -7%" }
    );

    revealNodes.forEach((node, index) => {
      node.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 90}ms`);
      observer.observe(node);
    });

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
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return <div className="scroll-progress" aria-hidden />;
}
