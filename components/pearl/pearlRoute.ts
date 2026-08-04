/**
 * Deterministic per-route variation.
 *
 * Every page shares one material; only the phase offsets and the pastel
 * undertone move. The values come from a hash of the pathname, so a route
 * always looks the same on every visit and on every device, and two routes
 * never land on an identical composition.
 */

export type PearlVariant = {
  /** Phase offsets fed to uSeed — shifts shape positions and deformation phase. */
  seed: [number, number, number];
  /** Pastel undertone fed to uTint. Stays inside a narrow, near-white gamut. */
  tint: [number, number, number];
};

/** Narrow pastel set — blush, lavender, icy blue, silver, warm champagne. */
const TINTS: [number, number, number][] = [
  [1.0, 0.955, 0.955], // blush
  [0.968, 0.955, 1.0], // pale lavender
  [0.948, 0.972, 1.0], // icy blue
  [0.965, 0.968, 0.972], // soft silver
  [1.0, 0.975, 0.948], // champagne
];

/** FNV-1a — small, stable, and dependency-free. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic 0..1 stream from one hash, so the three seeds stay uncorrelated. */
function unit(h: number, salt: number): number {
  return (hash32(`${h}:${salt}`) % 100000) / 100000;
}

export function pearlVariantForRoute(pathname: string | null | undefined): PearlVariant {
  const key = normalizeRoute(pathname);
  const h = hash32(key);
  return {
    seed: [unit(h, 1), unit(h, 2), unit(h, 3)],
    tint: TINTS[h % TINTS.length],
  };
}

/**
 * Collapse dynamic segments so `/scan/abc` and `/scan/def` share one identity —
 * the background should not visibly change when opening a detail view.
 */
export function normalizeRoute(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  const [first] = pathname.split("/").filter(Boolean);
  return first ? `/${first}` : "/";
}
