"use client";

import { useEffect, useRef } from "react";

/**
 * Pearl "liquid glass" background — an iridescent mother-of-pearl mesh gradient that
 * flows slowly and shifts hue with the pointer, overlaid with a fine film grain so it
 * reads like grained pearl glass rather than a flat gradient. Interactive by default:
 * the mesh warps and the holographic sheen rotates toward the cursor. Falls back to a
 * soft CSS gradient when WebGL is unavailable, renders one static frame under reduced
 * motion, and pauses when offscreen or the tab is hidden.
 */
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

// iridescent thin-film palette — cosine gradient tuned to pearl / mother-of-pearl
vec3 iridescence(float t){
  vec3 a = vec3(0.92, 0.90, 0.93);   // luminous pearl base
  vec3 b = vec3(0.18, 0.16, 0.20);   // sheen amplitude
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.00, 0.18, 0.42);   // phase -> pink / mint / periwinkle bands
  return a + b * cos(6.28318 * (c * t + d));
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = uv;
  p.x *= uRes.x / uRes.y;   // aspect correct

  float t = uTime * 0.04;

  // pointer as a lens that warps the mesh + rotates the sheen
  vec2 m = uMouse; m.x *= uRes.x / uRes.y;
  float md = distance(p, m);
  vec2 pull = (m - p) * exp(-md * 2.0) * (0.25 + uMouseAmt * 0.7);

  // domain-warped mesh flow
  vec2 q = vec2(fbm(p * 1.1 + t + pull), fbm(p * 1.1 + vec2(4.4, 1.1) - t));
  vec2 r = vec2(
    fbm(p * 1.1 + 3.0 * q + vec2(1.7, 9.2) + 0.10 * t + pull),
    fbm(p * 1.1 + 3.0 * q + vec2(8.3, 2.8) - 0.09 * t)
  );
  float f = fbm(p * 1.1 + 3.0 * r);

  // thin-film phase driven by the mesh + pointer proximity => holographic shift
  float phase = f * 0.65 + q.x * 0.35 + r.y * 0.25
    + uMouseAmt * exp(-md * 2.4) * 0.5
    + 0.08 * t;
  vec3 col = iridescence(phase);

  // keep it pearl: pull the whole thing toward luminous white, sheen as accent
  vec3 pearl = vec3(0.965, 0.955, 0.965);
  col = mix(pearl, col, 0.55 + 0.25 * uMouseAmt);

  // liquid-glass specular streak near the pointer
  float glow = exp(-md * 3.4) * (0.2 + uMouseAmt * 0.8);
  col += vec3(1.0) * glow * 0.35;

  // soft radial lift for the "glass" depth
  float vig = smoothstep(1.3, 0.2, distance(uv, vec2(0.5)));
  col *= mix(0.9, 1.05, vig);

  // fine film grain so it reads as grained pearl, not flat gradient
  float g = hash(gl_FragCoord.xy + fract(uTime) * 91.7);
  col += (g - 0.5) * 0.035;

  col = mix(pearl, col, clamp(uIntensity, 0.0, 1.4));
  gl_FragColor = vec4(col, 1.0);
}
`;

export function PearlCanvas({
  className = "",
  intensity = 1,
  interactive = true,
}: {
  className?: string;
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
      if (fallbackRef.current) fallbackRef.current.style.opacity = "1";
      return;
    }

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
        target.x = 0.5 + Math.sin(time * 0.1) * 0.26;
        target.y = 0.5 + Math.cos(time * 0.08) * 0.22;
        targetAmt = 0.3;
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

    // one static frame (covers reduced-motion)
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
  }, [intensity, interactive]);

  return (
    <div className={`pointer-events-none overflow-hidden ${className || "absolute inset-0"}`} aria-hidden>
      <div
        ref={fallbackRef}
        className="absolute inset-0 opacity-0 transition-opacity"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #f4eef2 0%, #eef2f5 30%, #f6eef4 55%, #eef4f0 80%, #f3eef6 100%)",
        }}
      />
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
