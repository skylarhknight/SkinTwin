import type { ReactNode } from "react";

type Accent = "plum" | "rose" | "champagne" | "sage";

const ACCENT: Record<Accent, string> = {
  plum: "text-sf-plum",
  rose: "text-sf-rose",
  champagne: "text-sf-champagne",
  sage: "text-sf-sage",
};

/**
 * Editorial page header — the interior-page echo of the homepage video hero:
 * a wide-tracked uppercase eyebrow, an optional index tag, and a large Fraunces
 * italic display title. Reveals on scroll (MotionLayer picks up `data-reveal`).
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  index,
  accent = "plum",
  italic = true,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  index?: string;
  accent?: Accent;
  italic?: boolean;
  children?: ReactNode;
}) {
  return (
    <header
      data-reveal
      className="relative flex flex-col gap-5 border-b border-sf-line/70 pb-7 md:flex-row md:items-end md:justify-between"
    >
      <div className="max-w-2xl">
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${ACCENT[accent]}`}>
            {eyebrow}
          </span>
          {index ? (
            <span className="font-display text-xs tracking-[0.14em] text-sf-muted">{index}</span>
          ) : null}
        </div>
        <h1
          className={`mt-4 font-display text-4xl font-medium leading-[1.02] tracking-[-0.02em] md:text-5xl ${
            italic ? "italic" : ""
          }`}
        >
          {title}
        </h1>
        {intro ? <p className="mt-4 max-w-xl text-sm leading-6 text-sf-muted">{intro}</p> : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">{children}</div>
      ) : null}
    </header>
  );
}
