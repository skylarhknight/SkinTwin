import type {
  FacialToneData,
  SimulationResponse,
  SimulationScenario,
  SkinMaskAsset,
  SkinMetrics,
} from "../types";
import { mockSkinMetrics } from "../mock/mockSkinData";
import { dataUrlToArrayBuffer } from "./dataUrl";
import { PerfectSkinAnalysisRejectedError } from "./perfectSkinErrors";
import { timeoutSignal, withTimeout } from "@/lib/fetchUtil";
import { runPerfectFacialTonePipeline } from "./facialTonePipeline";
import { runPerfectSkinAnalysisPipeline } from "./skinAnalysisPipeline";
import { runPerfectSkinSimulationPipeline } from "./skinSimulationPipeline";

const SKIN_SIM_PIPELINE_MS = 120_000;

export type PerfectImageInput = {
  imageUrl?: string;
  imageBuffer?: Buffer | ArrayBuffer;
  filename?: string;
  /** MIME type for Perfect File API, e.g. image/jpeg */
  contentType?: string;
};

export type PerfectSkinAnalysisResult = {
  metrics: SkinMetrics;
  raw: unknown;
  isMock: boolean;
  /** Present after a real Perfect run: which metrics came from API rows (others stay neutral baseline). */
  analyzedMetricKeys?: (keyof SkinMetrics)[];
  /** Per-concern mask overlays from Perfect (`enable_mask_overlay`). */
  maskAssets?: SkinMaskAsset[];
  /** Perfect's resized/aligned photo — the layer the masks line up with. */
  maskBaseUrl?: string;
  /** Perfect's estimated skin age. */
  skinAge?: number;
  /** Which action tier actually ran. */
  analysisTier?: "hd" | "sd";
};

export type PerfectFacialToneResult = {
  facialToneData: FacialToneData;
  raw: unknown;
  isMock: boolean;
};

type AgingInput = PerfectImageInput & {
  sourceImageUrl?: string;
  scenarioType: SimulationScenario;
  simulationYears?: number;
};

/**
 * Credentials are all that gate a live call. Endpoint paths are deliberately NOT required: each
 * pipeline defaults to the documented S2S path and reads its env var only as an override, so
 * requiring the var here silently forced every scan down the mock path.
 */
function hasPerfectCredentials(): boolean {
  return Boolean(process.env.PERFECT_API_KEY && process.env.PERFECT_API_BASE_URL);
}

async function postToPerfect(endpoint: string, body: unknown): Promise<unknown> {
  const baseUrl = process.env.PERFECT_API_BASE_URL;
  const apiKey = process.env.PERFECT_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Perfect Corp API configuration is missing.");
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const hint = await response.text().catch(() => "");
    throw new Error(
      `Perfect Corp API request failed with status ${response.status}${hint ? `: ${hint.slice(0, 500)}` : ""}`
    );
  }

  return response.json();
}

function buildAgingSimulationRequest(input: AgingInput): Record<string, unknown> {
  // TODO: Map to official Perfect Corp AI Aging Simulation payload.
  return {
    imageUrl: input.sourceImageUrl ?? input.imageUrl,
    scenarioType: input.scenarioType,
    simulationYears: input.simulationYears ?? 20,
  };
}

export async function analyzeSkin(input: PerfectImageInput): Promise<PerfectSkinAnalysisResult> {
  if (!hasPerfectCredentials()) {
    return {
      metrics: mockSkinMetrics,
      raw: { provider: "mock", metrics: mockSkinMetrics },
      isMock: true,
    };
  }

  const buf = input.imageBuffer;
  if (buf instanceof ArrayBuffer && buf.byteLength > 0) {
    try {
      const { metrics, raw, analyzedMetricKeys, maskAssets, maskBaseUrl, skinAge, tier } =
        await runPerfectSkinAnalysisPipeline(
          buf,
          input.filename ?? "scan.jpg",
          input.contentType ?? "image/jpeg"
        );
      return {
        metrics,
        raw,
        isMock: false,
        analyzedMetricKeys,
        maskAssets,
        maskBaseUrl,
        skinAge,
        analysisTier: tier,
      };
    } catch (e) {
      if (e instanceof PerfectSkinAnalysisRejectedError) throw e;
      console.warn("[analyzeSkin] Perfect skin pipeline failed:", e);
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  throw new Error("No image buffer provided for skin analysis.");
}

export async function analyzeFacialTone(input: PerfectImageInput): Promise<PerfectFacialToneResult> {
  const mockTone = (): PerfectFacialToneResult => ({
    facialToneData: {
      undertone: "neutral",
      pigmentationIndex: mockSkinMetrics.pigmentation,
      rednessIndex: mockSkinMetrics.redness,
    },
    raw: { provider: "mock", tone: "neutral" },
    isMock: true,
  });

  // Unlike skin analysis, the tone pipeline has no documented default path — without the env var
  // there is nothing to call, so stay on the mock tone rather than throwing.
  if (!hasPerfectCredentials() || !process.env.PERFECT_FACIAL_TONE_ENDPOINT) return mockTone();

  try {
    const buf = input.imageBuffer;
    if (!(buf instanceof ArrayBuffer) || buf.byteLength === 0) {
      return mockTone();
    }
    const { facialToneData, raw } = await runPerfectFacialTonePipeline(
      buf,
      input.filename ?? "scan.jpg",
      input.contentType ?? "image/jpeg"
    );

    return {
      facialToneData,
      raw,
      isMock: false,
    };
  } catch (e) {
    console.warn("[analyzeFacialTone] Perfect API failed; using mock tone:", e);
    return {
      facialToneData: {
        undertone: "neutral",
        pigmentationIndex: mockSkinMetrics.pigmentation,
        rednessIndex: mockSkinMetrics.redness,
      },
      raw: { provider: "mock", fallback: true, error: String(e) },
      isMock: true,
    };
  }
}

async function resolveSimulationImageBuffer(
  input: AgingInput
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  const ib = input.imageBuffer;
  if (ib instanceof ArrayBuffer && ib.byteLength > 0) {
    return { buffer: ib, contentType: input.contentType ?? "image/jpeg" };
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(ib)) {
    const u = new Uint8Array(ib as Buffer);
    return {
      buffer: u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength),
      contentType: input.contentType ?? "image/jpeg",
    };
  }

  const src = input.sourceImageUrl ?? input.imageUrl;
  if (!src) return null;

  if (src.startsWith("data:")) {
    try {
      const buffer = dataUrlToArrayBuffer(src);
      const mime = /^data:([^;]+);/i.exec(src)?.[1]?.trim() || "image/jpeg";
      return { buffer, contentType: mime };
    } catch {
      return null;
    }
  }

  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(src, { signal: timeoutSignal(45_000) });
    if (!res.ok) throw new Error(`Could not fetch source image (${res.status})`);
    const buffer = await res.arrayBuffer();
    const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    return { buffer, contentType: mime };
  }

  return null;
}

function extractLegacySimulatedUrl(raw: Record<string, unknown>, sourceImageUrl: string): string | undefined {
  const norm = (u: string) => u.split("?")[0];
  const src = norm(sourceImageUrl);

  const candidates: unknown[] = [
    raw.simulatedImageUrl,
    raw.simulated_url,
    raw.result_url,
    raw.output_url,
    raw.resultUrl,
    (raw.data as Record<string, unknown> | undefined)?.url,
    (raw.result as Record<string, unknown> | undefined)?.url,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && /^https?:\/\//i.test(c) && norm(c) !== src) return c;
  }
  return undefined;
}

export async function simulateAging(input: AgingInput): Promise<SimulationResponse> {
  const simulationYears = input.simulationYears ?? 20;
  const sourceImageUrl = input.sourceImageUrl ?? input.imageUrl ?? "/mock/skin-scan-placeholder.svg";

  const mockSimulation = (mockFallbackNote?: string): SimulationResponse => ({
    simulationId: `mock-simulation-${input.scenarioType}`,
    scenarioType: input.scenarioType,
    sourceImageUrl,
    simulatedImageUrl: "/mock/aging-simulation-placeholder.svg",
    scenarioDescription: getScenarioDescription(input.scenarioType, simulationYears),
    simulationYears,
    isMock: true,
    ...(mockFallbackNote ? { mockFallbackNote } : {}),
  });

  let resolved: Awaited<ReturnType<typeof resolveSimulationImageBuffer>> = null;
  try {
    resolved = await resolveSimulationImageBuffer(input);
  } catch (e) {
    console.warn("[simulateAging] Could not load source image for simulation:", e);
    resolved = null;
  }

  const baseConfigured = Boolean(process.env.PERFECT_API_KEY && process.env.PERFECT_API_BASE_URL);

  try {
    if (resolved && baseConfigured) {
      const { resultImageUrl } = await withTimeout(
        runPerfectSkinSimulationPipeline(
          resolved.buffer,
          input.filename ?? "scan.jpg",
          resolved.contentType,
          input.scenarioType
        ),
        SKIN_SIM_PIPELINE_MS,
        "Skin simulation pipeline"
      );
      return {
        simulationId: `skin-simulation-${Date.now()}`,
        scenarioType: input.scenarioType,
        sourceImageUrl,
        simulatedImageUrl: resultImageUrl,
        scenarioDescription: getScenarioDescription(input.scenarioType, simulationYears),
        simulationYears,
        isMock: false,
      };
    }
  } catch (e) {
    console.warn("[simulateAging] Skin simulation pipeline failed:", e);
    return mockSimulation(
      "Perfect AI Skin Simulation did not complete (timeout, API error, or wrong endpoint paths). Check PERFECT_API_KEY, PERFECT_API_BASE_URL, and Skin Simulation v2 in your Perfect Console; see server logs."
    );
  }

  // Legacy one-shot aging endpoint has no documented default path, so it stays opt-in via env var.
  if (hasPerfectCredentials() && process.env.PERFECT_AGING_SIMULATION_ENDPOINT) {
    try {
      const endpoint = process.env.PERFECT_AGING_SIMULATION_ENDPOINT as string;
      const raw = (await postToPerfect(endpoint, buildAgingSimulationRequest(input))) as Record<string, unknown>;
      const extracted = extractLegacySimulatedUrl(raw, sourceImageUrl);
      if (extracted) {
        return {
          simulationId: String(raw.id ?? `simulation-${Date.now()}`),
          scenarioType: input.scenarioType,
          sourceImageUrl,
          simulatedImageUrl: extracted,
          scenarioDescription: getScenarioDescription(input.scenarioType, simulationYears),
          simulationYears,
          isMock: false,
        };
      }
    } catch (e) {
      console.warn("[simulateAging] Legacy PERFECT_AGING_SIMULATION_ENDPOINT failed:", e);
    }
  }

  if (!baseConfigured) {
    return mockSimulation(
      "Add PERFECT_API_KEY and PERFECT_API_BASE_URL to .env.local for Perfect AI Skin Simulation (primary path). Optionally set PERFECT_AGING_SIMULATION_ENDPOINT for a legacy one-shot aging API."
    );
  }
  if (!resolved) {
    return mockSimulation(
      "The server could not load your photo. Complete a new scan in this app (stores a data URL) or use an https image URL—not a blob: link."
    );
  }
  return mockSimulation(
    "Simulation returned no image. Confirm Skin Simulation file/task paths match your Perfect Console, or configure PERFECT_AGING_SIMULATION_ENDPOINT as a fallback."
  );
}

function getScenarioDescription(scenarioType: SimulationScenario, years: number): string {
  const prefix = `Illustrative ${years}-year simulation`;
  switch (scenarioType) {
    case "consistent_spf_routine":
      return `${prefix} assuming daily SPF and routine consistency.`;
    case "skip_spf":
      return `${prefix} assuming inconsistent sun protection.`;
    case "stop_routine":
      return `${prefix} assuming skincare routine abandonment.`;
    case "current_trajectory":
      return `${prefix} based on current habit consistency.`;
  }
}
