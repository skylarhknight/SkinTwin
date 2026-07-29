"use client";

import { useEffect, useRef } from "react";

/**
 * Cinematic, interactive WebGL "fluid aurora" — a domain-warped noise field that
 * flows over time and reacts to the pointer, evoking the immersive 3D hero look of
 * motionsites.ai templates (Aetheris Voyage / 3D Story). Falls back to a static CSS
 * gradient when WebGL is unavailable or the user prefers reduced motion. Pauses when
 * offscreen or when the tab is hidden.
 */
const PALETTES: Record<string, number[][]> = {
  // r,g,b in 0..1 — luminous skincare neutrals
  skin: [
    [0.957, 0.788, 0.659], // peach  #f4c9a8
    [0.788, 0.722, 0.871], // lilac  #c9b8de
    [0.616, 0.702, 0.604], // sage   #9db39a
    [0.851, 0.541, 0.510], // rose   #d98a82
    [0.914, 0.788, 0.627], // champagne #e9c9a0
    [0.988, 0.965, 0.945], // ivory  #fcf6f1
  ],
  plum: [
    [0.431, 0.333, 0.439], // plum   #6e5570
    [0.627, 0.416, 0.494], // mauve  #a06a7e
    [0.851, 0.541, 0.510], // rose   #d98a82
    [0.788, 0.722, 0.871], // lilac  #c9b8de
    [0.914, 0.788, 0.627], // champagne
    [0.988, 0.965, 0.945], // ivory
  ],
};

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;      // 0..1, smoothed
uniform float uMouseAmt;  // 0..1 activity
uniform float uIntensity;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2;
uniform vec3 uC3; uniform vec3 uC4; uniform vec3 uC5;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++){
    v += a * noise(p);
    p = p * 2.0 + vec2(37.1, 11.7);
    a *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = uv;
  p.x *= uRes.x / uRes.y;   // aspect correct

  float t = uTime * 0.05;

  // pointer as a flow attractor -> interactive warp + depth
  vec2 m = uMouse; m.x *= uRes.x / uRes.y;
  float md = distance(p, m);
  vec2 pull = (m - p) * exp(-md * 2.2) * (0.35 + uMouseAmt * 0.9);

  // domain-warped fbm (Aetheris-style flowing bands)
  vec2 q = vec2(fbm(p * 1.3 + t + pull), fbm(p * 1.3 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(
    fbm(p * 1.3 + 3.5 * q + vec2(1.7, 9.2) + 0.12 * t + pull),
    fbm(p * 1.3 + 3.5 * q + vec2(8.3, 2.8) - 0.10 * t)
  );
  float f = fbm(p * 1.3 + 3.5 * r);

  // layered colour mixing for depth
  vec3 col = mix(uC5, uC1, clamp(f * 1.4, 0.0, 1.0));
  col = mix(col, uC0, clamp(q.x * 0.9, 0.0, 1.0));
  col = mix(col, uC2, clamp(r.y * 0.85, 0.0, 1.0));
  col = mix(col, uC3, clamp(pow(f, 2.0) * 1.1, 0.0, 1.0));
  col = mix(col, uC4, clamp(q.y * r.x * 1.3, 0.0, 1.0));

  // luminous pointer bloom
  float glow = exp(-md * 3.2) * (0.25 + uMouseAmt * 0.9);
  col += uC5 * glow * 0.6;

  // soft vignette to give the "voyage" depth
  float vig = smoothstep(1.25, 0.25, distance(uv, vec2(0.5)));
  col *= mix(0.82, 1.06, vig);

  col = mix(vec3(0.988, 0.965, 0.945), col, clamp(uIntensity, 0.0, 1.4));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function FluidCanvas({
  className = "",
  palette = "skin",
  intensity = 1,
  interactive = false,
}: {
  className?: string;
  palette?: keyof typeof PALETTES | string;
  intensity?: number;
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = (canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

    if (!gl) {
      // CSS fallback stays visible
      if (fallbackRef.current) fallbackRef.current.style.opacity = "1";
      return;
    }

    const colors = PALETTES[palette] ?? PALETTES.skin;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (fallbackRef.current) fallbackRef.current.style.opacity = "1";
      return;
    }
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uMouse = gl.getUniformLocation(program, "uMouse");
    const uMouseAmt = gl.getUniformLocation(program, "uMouseAmt");
    const uIntensity = gl.getUniformLocation(program, "uIntensity");
    const uC = [0, 1, 2, 3, 4, 5].map((i) => gl.getUniformLocation(program, `uC${i}`));
    uC.forEach((loc, i) => gl.uniform3fv(loc, colors[i] ?? colors[0]));
    gl.uniform1f(uIntensity, intensity);

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.round(rect.width * dpr));
      height = Math.max(1, Math.round(rect.height * dpr));
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uRes, width, height);
    };
    resize();

    // pointer state (smoothed) — auto-drifts when idle / on touch
    const target = { x: 0.5, y: 0.55 };
    const cur = { x: 0.5, y: 0.55 };
    let amt = 0;
    let targetAmt = 0;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      target.x = (e.clientX - rect.left) / rect.width;
      target.y = 1 - (e.clientY - rect.top) / rect.height;
      targetAmt = 1;
    };
    const onLeave = () => { targetAmt = 0; };
    if (interactive) {
      window.addEventListener("pointermove", onMove, { passive: true });
      canvas.addEventListener("pointerleave", onLeave);
    }

    let raf = 0;
    let visible = true;
    let running = false;
    const start = new Date().getTime();

    const frame = () => {
      const now = new Date().getTime();
      const time = (now - start) / 1000;
      if (!interactive) {
        // gentle cinematic auto-drift
        target.x = 0.5 + Math.sin(time * 0.12) * 0.28;
        target.y = 0.5 + Math.cos(time * 0.09) * 0.24;
        targetAmt = 0.35;
      }
      cur.x += (target.x - cur.x) * 0.05;
      cur.y += (target.y - cur.y) * 0.05;
      amt += (targetAmt - amt) * 0.04;
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, cur.x, cur.y);
      gl.uniform1f(uMouseAmt, amt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (running) raf = requestAnimationFrame(frame);
    };

    const play = () => {
      if (running || reduceMotion || !visible) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    // one frame always (covers reduced-motion static render)
    gl.uniform1f(uTime, 0);
    gl.uniform2f(uMouse, cur.x, cur.y);
    gl.uniform1f(uMouseAmt, 0.3);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) play();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const onVisibility = () => (document.hidden ? stop() : play());
    const onResize = () => resize();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    if (!reduceMotion) play();

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      if (interactive) {
        window.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerleave", onLeave);
      }
      const ext = gl.getExtension("WEBGL_lose_context");
      ext?.loseContext();
    };
  }, [palette, intensity, interactive]);

  return (
    <div className={`pointer-events-none overflow-hidden ${className || "absolute inset-0"}`} aria-hidden>
      <div
        ref={fallbackRef}
        className="absolute inset-0 opacity-0 transition-opacity"
        style={{ backgroundImage: "var(--grad-aurora)" }}
      />
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
