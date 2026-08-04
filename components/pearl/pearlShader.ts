/**
 * GLSL source for the pearl liquid-glass material.
 *
 * The whole material is a single full-screen fragment shader. A height field is
 * built from domain-warped fbm plus a few large, hand-placed sculptural forms
 * (broad ribbons + rounded pearl masses). A normal is taken from that height
 * field by finite difference, and the normal drives the shading: milky
 * subsurface body, glossy specular, fresnel rim, thin-film iridescence,
 * refraction of the backdrop, and faint caustics.
 *
 * Rendering a height field rather than real geometry keeps this dependency-free
 * (no three.js) while still reading as a dimensional, refractive material.
 */

export type PearlMode = "background" | "footer";
export type PearlQuality = "high" | "medium" | "low";

export const PEARL_VERTEX_SHADER = /* glsl */ `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/** Per-quality shader constants. Lower tiers drop octaves and sculptural forms. */
const QUALITY_DEFINES: Record<PearlQuality, { octaves: number; warpOctaves: number; forms: number }> = {
  high: { octaves: 5, warpOctaves: 4, forms: 3 },
  medium: { octaves: 4, warpOctaves: 3, forms: 2 },
  low: { octaves: 3, warpOctaves: 2, forms: 1 },
};

const PEARL_FRAGMENT_BODY = /* glsl */ `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec2  uPointer;     // 0..1 viewport space, y up, already damped
uniform float uPointerAmt;  // 0..1 pointer presence
uniform float uFlow;        // smoothed scroll travel, in viewport heights
uniform float uProgress;    // 0..1 smoothed page progress
uniform float uVelocity;    // -1..1 smoothed scroll velocity
uniform vec3  uSeed;        // deterministic per-route phase offsets
uniform vec3  uTint;        // per-route pastel undertone
uniform float uIntensity;   // overall material presence
uniform float uCalm;        // 0..1 how strongly the centre column is protected
uniform float uOpacity;     // global fade

#define TAU 6.2831853

/* ------------------------------------------------------------------ noise -- */

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

// value noise with a quintic fade — C2 continuous, so finite-difference
// normals stay smooth instead of faceting.
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

const mat2 ROT = mat2(0.80, 0.60, -0.60, 0.80);

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    v += a * vnoise(p);
    p = ROT * p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

float fbmWarp(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < WARP_OCTAVES; i++) {
    v += a * vnoise(p);
    p = ROT * p * 2.03 + 4.3;
    a *= 0.5;
  }
  return v;
}

/* ------------------------------------------------------------------ forms -- */

// Broad flowing ribbon: a soft gaussian band around a slowly undulating curve.
// Two incommensurate sine terms keep the crest from reading as a single wave.
float ribbon(vec2 p, float centre, float amp, float freq, float phase, float width) {
  float y = centre
    + amp * sin(p.x * freq + phase)
    + amp * 0.42 * sin(p.x * freq * 1.73 - phase * 0.77);
  float d = (p.y - y) / width;
  return exp(-d * d * 0.5);
}

// Rounded pearl mass — a stretched gaussian so it never reads as a plain circle.
float mass(vec2 p, vec2 centre, vec2 radius, float rot) {
  vec2 d = p - centre;
  float c = cos(rot), s = sin(rot);
  d = vec2(d.x * c - d.y * s, d.x * s + d.y * c) / radius;
  return exp(-dot(d, d));
}

/* ------------------------------------------------------------- height field -- */

// Slow, mutually incommensurate time bases so the loop never lands on itself.
float phaseA() { return uTime * 0.0210 + uSeed.x * TAU; }
float phaseB() { return uTime * 0.0134 + uSeed.y * TAU; }
float phaseC() { return uTime * 0.0087 + uSeed.z * TAU; }

// Domain warp — this is what turns plain bands into folding, stretching sheets.
vec2 warp(vec2 p) {
  float t = uTime * 0.0165;
  vec2 q = vec2(
    fbmWarp(p * 0.85 + vec2(uSeed.x * 9.0, t)),
    fbmWarp(p * 0.85 + vec2(3.7 - t * 0.8, uSeed.y * 9.0))
  );
  vec2 r = vec2(
    fbmWarp(p * 0.72 + 2.0 * q + vec2(1.7 + t * 0.55, 9.2)),
    fbmWarp(p * 0.72 + 2.0 * q + vec2(8.3, 2.8 - t * 0.47))
  );
  return p + (q - 0.5) * 0.86 + (r - 0.5) * 0.52;
}

// Pointer acts as a soft magnetic field: it displaces the domain slightly and
// adds a gentle swell. No trail, no chasing — the damping lives on the CPU side.
vec2 pointerPush(vec2 p, out float influence) {
  vec2 m = (uPointer - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  vec2 delta = p - m;
  float d2 = dot(delta, delta);
  influence = exp(-d2 * 3.4) * uPointerAmt;
  return p + normalize(delta + vec2(1e-4)) * influence * 0.085;
}

float field(vec2 p, out float influence) {
  p = pointerPush(p, influence);

  float a = phaseA();
  float b = phaseB();
  float c = phaseC();

  // Layer separation: each stratum drifts at its own scroll rate, so scrolling
  // reads as parallax through a volume rather than a sliding image.
  vec2 pFar  = p + vec2(0.00, uFlow * 0.085);
  vec2 pMid  = p + vec2(0.00, uFlow * 0.150);
  vec2 pNear = p + vec2(0.00, uFlow * 0.235);

  vec2 w = warp(pMid);
  // scroll velocity smears the warp very slightly — a sense of drag in the liquid
  w += vec2(0.0, uVelocity * 0.06);

  float h = 0.0;

  // Primary midground sheet — asymmetric, sweeping low-left to high-right.
  h += 1.00 * ribbon(w, -0.06 + 0.055 * sin(b), 0.24, 0.78, a * 2.4, 0.255);

  // Distant, blurrier membrane (wider band = softer edge).
  h += 0.62 * ribbon(warp(pFar) + vec2(2.3, 0.0), 0.20 + 0.070 * sin(c + 1.1), 0.30, 0.52, -a * 1.7 + 2.0, 0.40);

#if FORMS > 1
  // Foreground fold, tighter and higher-contrast, biased to the lower edge.
  h += 0.74 * ribbon(warp(pNear) - vec2(1.4, 0.0), -0.34 + 0.05 * sin(a * 1.9), 0.19, 1.05, a * 3.1 + 4.0, 0.185);
#endif

  // Rounded pearl masses, breathing on their own slow cycles.
  h += 0.85 * mass(w, vec2(-0.62 + 0.05 * sin(c), 0.16 + 0.06 * sin(b * 1.3)),
                   vec2(0.44 + 0.045 * sin(b), 0.30 + 0.035 * sin(c * 1.7)), 0.6 + 0.15 * sin(c));
  h += 0.70 * mass(w, vec2(0.68 + 0.055 * sin(b + 2.0), -0.12 + 0.05 * sin(c * 1.1)),
                   vec2(0.36 + 0.04 * sin(c), 0.26 + 0.03 * sin(b * 1.9)), -0.4 + 0.2 * sin(b));
#if FORMS > 2
  h += 0.52 * mass(warp(pNear), vec2(0.10 + 0.09 * sin(c * 0.8), 0.42 + 0.05 * sin(a * 2.2)),
                   vec2(0.30, 0.19), 1.2 + 0.25 * sin(a));
#endif

#ifdef FOOTER
  // A large form rising out of the bottom edge — the "pool of pearl serum".
  float rise = 0.62 + 0.06 * sin(b * 1.2);
  h += 1.15 * ribbon(w * vec2(0.85, 1.0), -0.34 - rise * 0.10, 0.13, 0.62, a * 1.6, 0.34);
  h += 0.55 * smoothstep(0.10, -0.55, p.y + 0.10 * sin(p.x * 1.7 + b * 2.0));
#endif

  // Fine surface tension ripple — very low amplitude, keeps the skin alive.
  h += 0.16 * fbm(w * 3.6 + vec2(a * 3.0, -c * 2.0));

  // Pointer swell: the material rises very slightly toward the cursor.
  h += influence * 0.30;

  // Soft saturation gives merging forms a rounded, surface-tension meniscus
  // instead of additive blowout; the smoothstep then pulls the result back
  // apart into real negative space, so the sheets read as separate bodies
  // rather than one saturated mass.
  return smoothstep(0.20, 0.94, 1.0 - exp(-h * 0.95));
}

/* ---------------------------------------------------------------- shading -- */

// Thin-film cosine palette: pearl white base, blush / lavender / icy-blue bands.
vec3 iridescence(float t) {
  vec3 a = vec3(0.870, 0.855, 0.885);
  vec3 b = vec3(0.115, 0.100, 0.125);
  vec3 c = vec3(1.000, 1.000, 1.000);
  vec3 d = vec3(0.000, 0.230, 0.480);
  return a + b * cos(TAU * (c * t + d));
}

// The light field behind the liquid: ivory paper with faint pastel pools.
vec3 backdrop(vec2 uv) {
  // A touch deeper than the page paper so the milky forms read as lit bodies
  // sitting in front of a field, rather than white on white.
  vec3 ivory = vec3(0.955, 0.943, 0.935);
  float pool = smoothstep(1.15, -0.1, distance(uv, vec2(0.24, 0.86 - uFlow * 0.04)));
  float pool2 = smoothstep(1.0, -0.05, distance(uv, vec2(0.86, 0.12 + uFlow * 0.03)));
  vec3 col = mix(ivory, ivory * mix(vec3(1.0), uTint, 0.85), pool * 0.55);
  col = mix(col, col * mix(vec3(1.0), vec3(0.965, 0.972, 0.996), 1.0), pool2 * 0.42);
  return col;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  // Readability mask: forms grow toward the edges, the centre column stays calm
  // so body copy never sits on top of a highlight.
  float edge = smoothstep(0.06, 0.62, abs(p.x) / max(aspect * 0.5, 0.5));
  float calm = mix(1.0 - uCalm * 0.72, 1.0, edge);

  float influence;
  float h = field(p, influence) * calm;

  // Finite-difference normal. Epsilon is in scene units, not pixels, so the
  // material keeps the same softness at every resolution / device ratio.
  const float E = 0.0045;
  float ignored;
  float hx = field(p + vec2(E, 0.0), ignored) * calm;
  float hy = field(p + vec2(0.0, E), ignored) * calm;
  vec3 N = normalize(vec3((h - hx) / E * 0.16, (h - hy) / E * 0.16, 1.0));

  float body = smoothstep(0.13, 0.56, h);
  float depth = smoothstep(0.08, 0.92, h);

  // Refraction — the backdrop is displaced by the surface normal, and the shift
  // scales with how much material the light has to pass through.
  vec2 refracted = uv + N.xy * 0.062 * body;
  vec3 bg = backdrop(refracted);

  // Milky, semi-opaque body with subsurface scattering toward the thin edges.
  vec3 milk = mix(vec3(0.975, 0.962, 0.960), vec3(1.0, 0.998, 0.996), depth);
  milk = mix(milk * mix(vec3(1.0), uTint, 0.60), milk, depth * 0.85);

  // Gentle caustic pooling inside the thicker parts.
  float caustic = fbm(refracted * vec2(aspect, 1.0) * 5.2 + N.xy * 2.4 + vec2(uTime * 0.026, -uTime * 0.019));
  caustic = pow(smoothstep(0.46, 0.96, caustic), 2.2);
  milk += caustic * 0.13 * depth;

  // Two-light glossy setup: cool key from upper-left, warm fill from lower-right.
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L1 = normalize(vec3(-0.42, 0.72, 0.55));
  vec3 L2 = normalize(vec3(0.55, -0.44, 0.70));
  vec3 H1 = normalize(L1 + V);
  vec3 H2 = normalize(L2 + V);
  float spec = pow(max(dot(N, H1), 0.0), 48.0);
  float sheen = pow(max(dot(N, H2), 0.0), 14.0);
  // Wrapped diffuse — this is what gives the sheets their sculptural volume
  // instead of a flat wash. Kept in a narrow, high-key range so the material
  // still reads as white pearl rather than grey.
  float lambert = dot(N, L1) * 0.5 + 0.5;
  float shade = mix(0.845, 1.065, smoothstep(0.12, 0.96, lambert));
  float fresnel = pow(1.0 - clamp(N.z, 0.0, 1.0), 3.0);

  float irisPhase = h * 0.55 + fresnel * 0.85 + N.x * 0.40
    + uProgress * 0.12 + uSeed.z + influence * 0.25;
  vec3 iris = iridescence(irisPhase);

  vec3 col = mix(bg, milk, body * 0.93);
  col *= mix(1.0, shade, body);
  // Soft contact shading where a form meets the field — reads as thickness.
  col *= 1.0 - smoothstep(0.03, 0.30, h) * (1.0 - body) * 0.075;
  // Iridescence enters through refraction and rim light, never as flat colour.
  col = mix(col, col * iris * 1.14, (fresnel * 0.60 + 0.14) * body);
  col += iris * fresnel * 0.26 * body;

  // Glossy pearl highlights + a restrained bloom skirt around them.
  float highlight = spec * 1.35 + sheen * 0.40;
  highlight *= mix(0.55, 1.0, edge);            // no hot specular behind centre text
  highlight *= 1.0 + influence * 0.55;          // highlights shift toward the pointer
  col += vec3(1.0, 0.998, 0.995) * highlight * body;
  col += vec3(1.0) * pow(spec, 0.45) * 0.055 * body;

  // Atmospheric haze so distant material recedes instead of stacking flat.
  col = mix(col, vec3(0.992, 0.985, 0.978), (1.0 - depth) * 0.22 * body);

  // Keep the whole field reading as white pearl.
  vec3 paper = vec3(0.980, 0.970, 0.960);
  col = mix(paper, col, clamp(uIntensity, 0.0, 1.6));

  // Very soft vignette lift for glass depth.
  float vig = smoothstep(1.35, 0.15, distance(uv, vec2(0.5, 0.52)));
  col *= mix(0.972, 1.012, vig);

  // Fine film grain — reads as grained pearl, and kills gradient banding.
  float grain = hash21(gl_FragCoord.xy * 0.7 + fract(uTime) * 137.0);
  col += (grain - 0.5) * 0.020;

  float alpha = uOpacity;
#ifdef FOOTER
  // Transition band: the footer material fades in from the page above it.
  alpha *= smoothstep(1.0, 0.74, uv.y);
  // and deepens toward the bottom edge, like settling into a pool.
  col = mix(col, col * vec3(0.985, 0.978, 0.982), smoothstep(0.5, 0.0, uv.y) * 0.35);
#endif

  col = clamp(col, 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

/** Assemble the fragment shader for a given mode + quality tier. */
export function buildPearlFragmentShader(mode: PearlMode, quality: PearlQuality): string {
  const q = QUALITY_DEFINES[quality];
  const defines = [
    `#define OCTAVES ${q.octaves}`,
    `#define WARP_OCTAVES ${q.warpOctaves}`,
    `#define FORMS ${q.forms}`,
    mode === "footer" ? "#define FOOTER 1" : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${defines}\n${PEARL_FRAGMENT_BODY}`;
}
