/**
 * WebGL plumbing for the pearl material.
 *
 * Deliberately framework-free: it owns the context, the program, the fullscreen
 * triangle, and the uniform locations, and exposes `resize` / `render` /
 * `dispose`. React never touches GL state, and nothing here reads the DOM
 * beyond the canvas it was handed.
 */

import {
  PEARL_VERTEX_SHADER,
  buildPearlFragmentShader,
  type PearlMode,
  type PearlQuality,
} from "./pearlShader";

/** Values that never change for the lifetime of a surface. */
export type PearlStaticUniforms = {
  seed: [number, number, number];
  tint: [number, number, number];
  intensity: number;
  /** 0..1 — how strongly the centre column is protected from highlights. */
  calm: number;
  opacity: number;
};

/** Values that change per frame. */
export type PearlFrameUniforms = {
  time: number;
  pointerX: number;
  pointerY: number;
  pointerAmt: number;
  flow: number;
  progress: number;
  velocity: number;
};

const UNIFORM_NAMES = [
  "uResolution",
  "uTime",
  "uPointer",
  "uPointerAmt",
  "uFlow",
  "uProgress",
  "uVelocity",
  "uSeed",
  "uTint",
  "uIntensity",
  "uCalm",
  "uOpacity",
] as const;

type UniformName = (typeof UNIFORM_NAMES)[number];

export class PearlRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private uniforms: Partial<Record<UniformName, WebGLUniformLocation | null>> = {};
  private disposed = false;

  private constructor(
    private canvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    buffer: WebGLBuffer
  ) {
    this.gl = gl;
    this.program = program;
    this.buffer = buffer;
    for (const name of UNIFORM_NAMES) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
  }

  /** Returns null when WebGL is unavailable or the program fails to build. */
  static create(canvas: HTMLCanvasElement, mode: PearlMode, quality: PearlQuality): PearlRenderer | null {
    const attrs: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    };

    const gl = (canvas.getContext("webgl", attrs) ||
      canvas.getContext("experimental-webgl", attrs)) as WebGLRenderingContext | null;
    if (!gl) return null;

    const program = buildProgram(gl, PEARL_VERTEX_SHADER, buildPearlFragmentShader(mode, quality));
    if (!program) return null;

    const buffer = gl.createBuffer();
    if (!buffer) return null;

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // One oversized triangle covering the viewport — cheaper than two triangles.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPosition = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // The shader outputs premultiplied colour so the footer's fade band and the
    // background's global opacity composite correctly over the page.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    return new PearlRenderer(canvas, gl, program, buffer);
  }

  setStatic(values: PearlStaticUniforms): void {
    if (this.disposed) return;
    const { gl, uniforms } = this;
    gl.useProgram(this.program);
    gl.uniform3fv(uniforms.uSeed ?? null, values.seed);
    gl.uniform3fv(uniforms.uTint ?? null, values.tint);
    gl.uniform1f(uniforms.uIntensity ?? null, values.intensity);
    gl.uniform1f(uniforms.uCalm ?? null, values.calm);
    gl.uniform1f(uniforms.uOpacity ?? null, values.opacity);
  }

  /** `cssWidth` / `cssHeight` are layout pixels; `ratio` is the effective DPR. */
  resize(cssWidth: number, cssHeight: number, ratio: number): void {
    if (this.disposed) return;
    const width = Math.max(1, Math.round(cssWidth * ratio));
    const height = Math.max(1, Math.round(cssHeight * ratio));
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    this.gl.useProgram(this.program);
    this.gl.uniform2f(this.uniforms.uResolution ?? null, width, height);
  }

  render(frame: PearlFrameUniforms): void {
    if (this.disposed) return;
    const { gl, uniforms } = this;
    gl.useProgram(this.program);
    gl.uniform1f(uniforms.uTime ?? null, frame.time);
    gl.uniform2f(uniforms.uPointer ?? null, frame.pointerX, frame.pointerY);
    gl.uniform1f(uniforms.uPointerAmt ?? null, frame.pointerAmt);
    gl.uniform1f(uniforms.uFlow ?? null, frame.flow);
    gl.uniform1f(uniforms.uProgress ?? null, frame.progress);
    gl.uniform1f(uniforms.uVelocity ?? null, frame.velocity);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const { gl } = this;
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
    // Free the GPU context immediately rather than waiting for GC — route
    // changes would otherwise pile up contexts until the browser drops them.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

function buildProgram(gl: WebGLRenderingContext, vertexSrc: string, fragmentSrc: string): WebGLProgram | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSrc);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[pearl] shader compile failed:", gl.getShaderInfoLog(shader));
    }
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}
