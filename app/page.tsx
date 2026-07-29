"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MotionLayer } from "@/components/MotionLayer";
import { AuroraCanvas } from "@/components/AuroraCanvas";
import { FluidCanvas } from "@/components/FluidCanvas";
import { PearlCanvas } from "@/components/PearlCanvas";
import { getCurrentUser, type SkinTwinUser } from "@/lib/auth/authClient";

const VIDEO_URL =
  "https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-v-i-d-e-o-v1/media__2/-t-e-x-t_-t-o_-v-i-d-e-o-f62632d7-7495-4d5d-ab8a-d2e8629d3084.mp4?Expires=2100695004&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=Zc-q5fAgEmIk2TD2fpB2Up2~n78Mot1HF2XCwYnrCLnlwlslRUlDwVn1zSnDq4duFhZpEEZ2X3c2RYlJT06V3UfJ4NFxcfYC8O58AQ5nwPXUWI~Lkgkc6JinSBMha9lJWyHkf7lp1MKkYpG9DwGfGqHHLRpEWJBeiGGtUhZmCkCBia8A27y3a0NYRYYiHD3MkPU1cvccrxDuSI2UiIotTtBqdNDr20~xAWYE2E0U4HCXXzX5Xvns~JGnit9ONUVmnH2cuXTI~7AExho-QQpg07VXckepe~t84ajrQgdJe4RaIxRBV9mi3wYBqGL~BOczjScZmu2xdtqhr4P7CxCi4A__";

const NAV_LINKS: [string, string][] = [
  ["Dashboard", "/dashboard"],
  ["Scan", "/scan"],
  ["Trends", "/trends"],
  ["Routine", "/routine"],
  ["Future", "/future"],
  ["Shop", "/recommendations"],
];

const features = [
  { n: "01", title: "Face scan", body: "A 30-second selfie becomes a clear baseline for hydration, texture, tone, and more.", href: "/scan", kind: "scan" },
  { n: "02", title: "Habit clues", body: "Connect sleep, water, SPF, and stress with the changes your skin is actually showing.", href: "/habits", kind: "habit" },
  { n: "03", title: "Future you", body: "Compare how your routine and sun habits could shape the next 5, 10, or 20 years.", href: "/future", kind: "future" },
];

export default function HomePage() {
  const [user, setUser] = useState<SkinTwinUser | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  const authed = !!user;
  const ctaHref = authed ? "/dashboard" : "/login?next=/onboarding";
  const ctaLabel = authed ? "Enter my dashboard" : "Meet my SkinTwin";

  return (
    <div className="relative min-h-screen bg-sf-bg text-sf-ink">
      <MotionLayer />
      <HomeNav authed={authed} />
      <VideoScrubHero ctaHref={ctaHref} ctaLabel={ctaLabel} authed={authed} />

      <main className="mx-auto max-w-6xl px-5 md:px-8">
        {/* How it works */}
        <section id="how-it-works" className="py-24 md:py-32">
          <div data-reveal className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sf-plum">The tiny things add up</p>
              <h2 className="mt-4 max-w-3xl font-display text-4xl font-medium leading-[1.02] md:text-6xl">One luminous loop.<br />Three quiet steps.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-sf-muted">Less guessing, more noticing. SkinTwin turns a face scan and a few daily details into a picture you can actually use.</p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature, index) => (
              <Link
                key={feature.n}
                href={feature.href}
                data-reveal
                className={`group relative min-h-[430px] overflow-hidden rounded-[2.25rem] border p-6 transition-transform hover:-translate-y-2 ${index === 1 ? "border-white/50 text-white shadow-sf md:translate-y-8" : "card"}`}
              >
                {index === 1 ? (
                  <>
                    <AuroraCanvas className="absolute inset-0" palette="plum" intensity={1.4} />
                    <div className="absolute inset-0 bg-gradient-to-br from-sf-plum/80 to-[#a06a7e]/72" aria-hidden />
                  </>
                ) : null}
                <div className="relative flex items-center justify-between"><span className="font-display text-sm font-medium tracking-[0.1em]">{feature.n} / 03</span><span className="grid h-10 w-10 place-items-center rounded-full border border-current text-xl transition-transform group-hover:rotate-45">↗</span></div>
                <FeatureArt kind={feature.kind} light={index === 1} />
                <h3 className="relative mt-8 font-display text-3xl font-medium">{feature.title}</h3>
                <p className={`relative mt-3 text-sm leading-6 ${index === 1 ? "text-white/80" : "text-sf-muted"}`}>{feature.body}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Signal map */}
      <section className="relative overflow-hidden border-y border-sf-line bg-sf-surface/70 py-24 backdrop-blur md:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 md:grid-cols-[.9fr_1.1fr] md:px-8">
          <div data-reveal="left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sf-rose">Your clues, connected</p>
            <h2 className="mt-4 font-display text-4xl font-medium leading-[1.02] md:text-6xl">See the whole story, not just today&apos;s selfie.</h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-sf-muted">Your skin doesn&apos;t live in a vacuum. SkinTwin brings your metrics and everyday habits into one calm map, making patterns easier to spot over time.</p>
            <ul className="mt-8 space-y-3 text-sm font-medium">
              {["Personal skin score", "Habit-aware insights", "Routine & future scenarios"].map((item, i) => (
                <li key={item} className="flex items-center gap-3"><span className={`grid h-7 w-7 place-items-center rounded-full text-white shadow-sf-sm ${i === 0 ? "bg-sf-champagne" : i === 1 ? "bg-sf-plum" : "bg-sf-rose"}`}>✓</span>{item}</li>
              ))}
            </ul>
          </div>
          <div data-reveal="right" className="relative aspect-square" data-parallax="0.035">
            <SignalMap />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32" data-reveal>
        <div className="relative overflow-hidden rounded-[2.75rem] border border-white/50 px-6 py-16 text-center text-white shadow-sf md:px-10 md:py-24">
          <FluidCanvas className="absolute inset-0" palette="plum" intensity={1.2} />
          <div className="absolute inset-0 bg-gradient-to-br from-sf-plum/82 via-[#7c5a72]/74 to-[#a06a7e]/66" aria-hidden />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sf-champagne">Your skin is already talking</p>
            <h2 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-medium leading-[1.02] md:text-7xl">Ready to listen?</h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-white/80">Take your first scan and start building a clearer, kinder relationship with your skin.</p>
            <Link href={ctaHref} className="btn-secondary mt-8">{ctaLabel} <span className="ml-3">↗</span></Link>
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}

/* ---------------------------------------------------------------- Nav --- */
function HomeNav({ authed }: { authed: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 1.3);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "border-b border-sf-line bg-sf-bg/75 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="SkinTwin home">
          <LogoMark light={!scrolled} />
          <span
            className={`font-display text-lg font-medium tracking-tight transition-colors ${scrolled ? "text-sf-ink" : "text-white"}`}
            style={!scrolled ? { mixBlendMode: "exclusion" } : undefined}
          >
            SkinTwin<span className="text-sf-rose">.</span>
          </span>
        </Link>

        <nav
          className={`hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors lg:flex ${
            scrolled ? "text-sf-muted" : "text-white"
          }`}
          style={!scrolled ? { mixBlendMode: "exclusion" } : undefined}
          aria-label="Primary"
        >
          {NAV_LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="transition-opacity hover:opacity-60">
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href={authed ? "/dashboard" : "/login?next=/onboarding"}
          className={`rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all ${
            scrolled
              ? "bg-grad-cta text-white shadow-[0_10px_22px_-12px_rgba(110,85,112,.7)]"
              : "border border-white/70 text-white"
          }`}
          style={!scrolled ? { mixBlendMode: "exclusion" } : undefined}
        >
          {authed ? "Dashboard" : "Start scan ↗"}
        </Link>
      </div>
    </header>
  );
}

function LogoMark({ light }: { light: boolean }) {
  if (light) {
    return (
      <span className="relative grid h-9 w-9 place-items-center rounded-[0.85rem] border border-white/80" style={{ mixBlendMode: "exclusion" }}>
        <span className="font-display text-base font-semibold text-white">S</span>
      </span>
    );
  }
  return (
    <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-[0.85rem] border border-white/60 bg-grad-aurora shadow-sf-sm">
      <span className="absolute -bottom-3 -right-2 h-7 w-7 rounded-full bg-sf-plum/70" />
      <span className="relative font-display text-base font-semibold text-white">S</span>
    </span>
  );
}

/* -------------------------------------------------------------- Hero --- */
function VideoScrubHero({ ctaHref, ctaLabel, authed }: { ctaHref: string; ctaLabel: string; authed: boolean }) {
  const heroRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // prime a decoded frame, then park at 0 for scrubbing. The <video> renders at full
  // opacity over a matching backdrop, so there's no reveal gate to get stuck — whatever
  // has decoded simply shows.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    (v as HTMLVideoElement & { playsInline: boolean }).playsInline = true;

    const prime = () => {
      // pull the decoder awake, then park at frame 0 for scrubbing
      v.play().then(() => { v.pause(); v.currentTime = 0; }).catch(() => {});
    };
    if (v.readyState >= 2) prime();
    else v.addEventListener("loadeddata", prime, { once: true });
    return () => {
      v.removeEventListener("loadeddata", prime);
    };
  }, []);

  // scroll position drives currentTime
  useEffect(() => {
    let raf = 0;
    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = heroRef.current;
        const v = videoRef.current;
        if (!el || !v || !v.duration) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const progress = total > 0 ? clamp(-rect.top / total) : 0;
        if (!v.seeking) v.currentTime = progress * v.duration;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={heroRef} className="relative h-[240vh]">
      <div className="sticky top-0 flex h-screen w-full items-stretch overflow-hidden bg-[#f2ebe4]">
        <video
          ref={videoRef}
          src={VIDEO_URL}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* gentle pastel wash so overlay text and the pink-glow edges feel cohesive */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#e9cbd0]/30" aria-hidden />

        {/* editorial overlay — exclusion keeps white legible over any frame */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-5 pt-24 text-white md:p-10 md:pt-28" style={{ mixBlendMode: "exclusion" }}>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em]">F/W 26 — AI Skin Intelligence</p>
            <h1 className="mt-5 max-w-[15ch] font-display text-[clamp(2.75rem,8vw,7rem)] font-medium italic leading-[0.94] tracking-[-0.02em]">
              Meet your skin&apos;s other half
            </h1>
          </div>

          <div className="flex items-end justify-between gap-6">
            <div className="max-w-xs">
              <p className="text-[11px] uppercase tracking-[0.26em]">Powered by Perfect Corp</p>
              <p className="mt-2 text-sm leading-relaxed tracking-wide opacity-90">
                Skin Analysis · Facial Tone · Simulation. A luminous feedback loop — scan, notice, glow.
              </p>
            </div>
            <div className="hidden text-right text-[11px] uppercase leading-relaxed tracking-[0.24em] sm:block">
              <p>Study N°014</p>
              <p className="opacity-80">Scroll to scrub</p>
              <p className="opacity-80">00:00 — 00:∞</p>
            </div>
          </div>
        </div>

        {/* real CTA + scroll cue live outside the exclusion layer so they stay interactive/on-brand */}
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-4 md:bottom-10">
          <Link href={ctaHref} className="btn-secondary pointer-events-auto">
            {ctaLabel} <span className="ml-2">↗</span>
          </Link>
          <span className="text-[10px] uppercase tracking-[0.4em] text-white" style={{ mixBlendMode: "exclusion" }}>
            ( scroll )
          </span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Footer --- */
function HomeFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/60">
      <PearlCanvas className="absolute inset-0" intensity={1.15} />
      {/* faint scrim only under the text column for legibility — keeps the pearl visible */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/25 to-transparent" aria-hidden />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-5 py-14 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark light={false} />
            <span className="font-display text-lg font-medium tracking-tight">SkinTwin<span className="text-sf-rose">.</span></span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-sf-muted">
            AI skincare tracking, habit insights, and future-aging simulation. Private by design · Never medical advice.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-sf-muted">
          {NAV_LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="transition-colors hover:text-sf-ink">{label}</Link>
          ))}
        </nav>
      </div>
      <p className="relative border-t border-white/50 px-5 py-5 text-center text-[10px] uppercase tracking-[0.24em] text-sf-muted md:px-8">
        © {new Date().getFullYear()} SkinTwin — Soft intelligence for your skin
      </p>
    </footer>
  );
}

/* --------------------------------------------------------- Graphics --- */
function FeatureArt({ kind, light = false }: { kind: string; light?: boolean }) {
  const line = light ? "rgba(255,255,255,.6)" : "#d9c7dc";
  if (kind === "scan") return (
    <div className="relative mx-auto mt-12 h-48 w-48">
      <div className="orbit-spin absolute inset-0 rounded-full border border-dashed" style={{ borderColor: line }} />
      <div className="absolute inset-[14%] rounded-full border" style={{ borderColor: line }} />
      <div className="blob-float absolute inset-6 overflow-hidden rounded-full border border-white/60 shadow-sf-sm backdrop-blur">
        <div className="absolute -inset-1/2 bg-grad-aurora opacity-80 mix-blend-screen blob-float" />
        <div className="absolute left-[20%] top-[16%] h-1/3 w-1/3 rounded-full bg-white/70 blur-xl" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/70 shadow-[0_0_12px_2px_rgba(255,255,255,.6)]" />
      </div>
    </div>
  );
  if (kind === "habit") return (
    <div className="relative mx-auto mt-12 h-48 w-full max-w-[250px]">
      {[24, 55, 84].map((left, i) => <div key={left} className={`absolute bottom-4 w-12 rounded-t-full shadow-sf-sm ${i === 0 ? "h-24 bg-sf-champagne" : i === 1 ? "h-40 bg-sf-rose" : "h-32 bg-sf-sage"}`} style={{ left: `${left}%`, transform: "translateX(-50%)" }} />)}
      <div className="absolute inset-x-2 bottom-4 border-b-[1.5px]" style={{ borderColor: line }} />
    </div>
  );
  return (
    <div className="relative mx-auto mt-12 h-48 w-48">
      <div className="blob-float absolute left-0 top-5 h-32 w-32 rounded-full bg-sf-lilac/80 mix-blend-multiply shadow-sf-sm" />
      <div className="blob-float-delayed absolute bottom-0 right-0 h-32 w-32 rounded-full bg-sf-peach/90 mix-blend-multiply shadow-sf-sm" />
      <span className="absolute left-[42%] top-[40%] z-10 font-display text-3xl font-medium text-white">+20</span>
    </div>
  );
}

function SignalMap() {
  return (
    <svg viewBox="0 0 520 520" className="h-full w-full overflow-visible" role="img" aria-label="A calm visualization connecting hydration, sleep, SPF, and stress to one skin score">
      <defs>
        <linearGradient id="sig1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9b8de" /><stop offset="100%" stopColor="#9db39a" />
        </linearGradient>
        <linearGradient id="sig2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4c9a8" /><stop offset="100%" stopColor="#e9c9a0" />
        </linearGradient>
        <linearGradient id="sig3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8a9a0" /><stop offset="100%" stopColor="#d98a82" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#c9b8de" strokeOpacity=".35">
        {[210, 160, 110, 60].map((r) => <circle key={r} cx="260" cy="260" r={r} />)}
        {[0, 45, 90, 135].map((angle) => <line key={angle} x1="260" y1="260" x2={260 + 220 * Math.cos((angle * Math.PI) / 180)} y2={260 + 220 * Math.sin((angle * Math.PI) / 180)} />)}
      </g>
      <path d="M260 76C340 70 400 153 373 232C443 283 391 398 302 376C254 449 148 408 158 322C67 278 107 164 195 168C197 115 226 83 260 76Z" fill="url(#sig1)" fillOpacity=".72" stroke="#c9b8de" strokeWidth="1.2" />
      <path d="M260 122C310 111 331 184 318 232C385 255 363 330 300 314C270 370 211 339 221 292C162 272 170 207 217 207C216 161 233 129 260 122Z" fill="url(#sig2)" fillOpacity=".8" stroke="#e0cf9d" strokeWidth="1.2" />
      <path d="M260 174C292 164 304 211 293 240C329 253 326 291 287 288C267 318 231 294 241 266C211 248 222 217 248 220C245 198 251 179 260 174Z" fill="url(#sig3)" fillOpacity=".78" stroke="#d99c95" strokeWidth="1.2" />
      <circle cx="260" cy="260" r="42" fill="#fffdfb" stroke="#e7ddd3" strokeWidth="1.2" />
      <text x="260" y="255" textAnchor="middle" fontSize="12" fontWeight="700" fill="#8c8088">SKIN SCORE</text>
      <text x="260" y="281" textAnchor="middle" fontSize="24" fontWeight="800" fill="#33262e">78</text>
      {[
        [260, 28, "HYDRATION", "82"], [470, 255, "SPF", "7d"], [263, 495, "SLEEP", "7.4h"], [48, 262, "STRESS", "low"],
      ].map(([x, y, label, value]) => <g key={String(label)}><circle cx={Number(x)} cy={Number(y)} r="27" fill="#fffdfb" stroke="#e7ddd3" strokeWidth="1.2" /><text x={Number(x)} y={Number(y) - 2} textAnchor="middle" fontSize="8" fontWeight="700" fill="#8c8088">{label}</text><text x={Number(x)} y={Number(y) + 11} textAnchor="middle" fontSize="12" fontWeight="800" fill="#33262e">{value}</text></g>)}
      <circle cx="260" cy="260" r="4" fill="#6e5570" />
    </svg>
  );
}
