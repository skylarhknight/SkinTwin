import type { SkinMaskAsset, SkinMetrics } from "@/lib/types";
import { PerfectSkinAnalysisRejectedError } from "@/lib/perfect/perfectSkinErrors";
import { neutralBaselineMetrics } from "@/lib/skin/skinScore";
import { normalizePerfectBaseUrl } from "@/lib/perfect/baseUrl";

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Map Perfect `output[].type` strings to app SkinMetrics keys (SD task actions). */
const PERFECT_TYPE_TO_METRIC: Record<string, keyof SkinMetrics> = {
  wrinkle: "wrinkles",
  wrinkles: "wrinkles",
  hd_wrinkle: "wrinkles",
  pore: "pores",
  pores: "pores",
  hd_pore: "pores",
  texture: "texture",
  hd_texture: "texture",
  acne: "acne",
  hd_acne: "acne",
  age_spot: "pigmentation",
  age_spots: "pigmentation",
  hd_age_spot: "pigmentation",
  hydration: "hydration",
  moisture: "hydration",
  hd_moisture: "hydration",
  redness: "redness",
  hd_redness: "redness",
  dark_circle: "darkCircles",
  dark_circles: "darkCircles",
  dark_circle_v2: "darkCircles",
  hd_dark_circle: "darkCircles",
  pigmentation: "pigmentation",
  radiance: "radiance",
  hd_radiance: "radiance",
  oiliness: "oiliness",
  hd_oiliness: "oiliness",
};

function readScore(row: Record<string, unknown>): number | undefined {
  const v = row.ui_score ?? row.raw_score ?? row.score;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function readConcernType(row: Record<string, unknown>): string {
  const t = row.type ?? row.dst_action ?? row.concern ?? row.name ?? row.category;
  return String(t ?? "");
}

const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);

/**
 * Pull the mask-overlay image URL off one output row.
 *
 * Perfect returns `mask_urls` as an array (one entry per concern) and leaves the scalar `url`
 * null on skin-analysis rows, so the array is checked first. The scalar fields remain as a
 * fallback for other task shapes.
 */
function readMaskUrl(row: Record<string, unknown>): string | undefined {
  const list = row.mask_urls ?? row.maskUrls;
  if (Array.isArray(list)) {
    const first = list.find(isUrl);
    if (first) return first;
  }

  for (const field of ["mask_url", "maskUrl", "overlay_url", "url", "file_url", "image_url"]) {
    if (isUrl(row[field])) return row[field] as string;
  }

  return undefined;
}

/**
 * Perfect renders masks against its own resized/aligned copy of the photo, returned on the
 * `resize_image` row. Overlaying them on the original selfie would misalign whenever Perfect
 * rescaled or re-cropped it, so this image is the correct base layer.
 */
function readResizedBaseUrl(output: Array<Record<string, unknown>>): string | undefined {
  const row = output.find((r) => readConcernType(r).toLowerCase() === "resize_image");
  return row ? readMaskUrl(row) : undefined;
}

/** Perfect's estimated skin age, returned as its own output row alongside the concerns. */
function readSkinAge(output: Array<Record<string, unknown>>): number | undefined {
  const row = output.find((r) => readConcernType(r).toLowerCase() === "skin_age");
  if (!row) return undefined;
  const v = readScore(row);
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined;
}

function mapPerfectOutputToMetrics(output: Array<Record<string, unknown>>): {
  metrics: SkinMetrics;
  analyzedMetricKeys: (keyof SkinMetrics)[];
  maskAssets: SkinMaskAsset[];
} {
  const metrics: SkinMetrics = neutralBaselineMetrics();
  const seen = new Set<keyof SkinMetrics>();
  const maskAssets: SkinMaskAsset[] = [];
  for (const row of output) {
    const perfectType = readConcernType(row).toLowerCase().replace(/-/g, "_");
    const key = PERFECT_TYPE_TO_METRIC[perfectType];
    if (!key) continue;
    const v = readScore(row);
    if (v === undefined) continue;
    metrics[key] = clampScore(v);
    seen.add(key);

    const maskUrl = readMaskUrl(row);
    if (maskUrl && !maskAssets.some((m) => m.metricKey === key)) {
      maskAssets.push({ metricKey: key, perfectType, url: maskUrl, isEphemeral: true });
    }
  }
  if (seen.size === 0) {
    throw new Error(
      `Perfect skin analysis returned no recognizable metric rows. Sample: ${JSON.stringify(output[0] ?? []).slice(0, 200)}`
    );
  }
  return { metrics, analyzedMetricKeys: [...seen], maskAssets };
}

function parseBody(json: unknown): { ok: boolean; data?: Record<string, unknown>; message?: string } {
  if (!json || typeof json !== "object") return { ok: false, message: "invalid json" };
  const o = json as Record<string, unknown>;
  const status = o.status;
  const data = o.data;
  if (typeof status === "number" && status !== 200) {
    return { ok: false, message: String(o.error ?? o.message ?? status) };
  }
  if (typeof status === "string" && Number(status) >= 400) {
    return { ok: false, message: String(o.error ?? status) };
  }
  if (data && typeof data === "object") return { ok: true, data: data as Record<string, unknown> };
  return { ok: false, message: "missing data" };
}

function extractPollState(data: Record<string, unknown>): {
  taskStatus: string;
  output: Array<Record<string, unknown>>;
} {
  const taskStatus = String(
    data.task_status ??
      data.taskStatus ??
      (data.results as Record<string, unknown> | undefined)?.task_status ??
      ""
  ).toLowerCase();

  const results = data.results as Record<string, unknown> | undefined;
  let output: unknown = results?.output;
  if (!Array.isArray(output)) output = data.output;
  if (!Array.isArray(output)) output = (data.result as Record<string, unknown> | undefined)?.output ?? data.outputs;

  return {
    taskStatus,
    output: Array.isArray(output) ? (output as Array<Record<string, unknown>>) : [],
  };
}

/**
 * Primary action set: the HD concerns that map 1:1 onto our ten SkinMetrics keys, so every
 * dimension the UI renders is measured rather than a placeholder. Never mix HD and SD in one task.
 */
const HD_DST_ACTIONS = [
  "hd_moisture",
  "hd_redness",
  "hd_acne",
  "hd_pore",
  "hd_texture",
  "hd_wrinkle",
  "hd_dark_circle",
  "hd_age_spot",
  "hd_radiance",
  "hd_oiliness",
] as const;

/** Fallback for accounts without HD entitlement — the SD triad available on the base plan. */
const SD_DST_ACTIONS = ["acne", "wrinkle", "age_spot"] as const;

function getDstActions(): { actions: string[]; tier: "hd" | "sd"; overridden: boolean } {
  const raw = process.env.PERFECT_DST_ACTIONS?.trim();
  if (!raw) return { actions: [...HD_DST_ACTIONS], tier: "hd", overridden: false };
  const actions = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!actions.length) return { actions: [...HD_DST_ACTIONS], tier: "hd", overridden: false };
  return {
    actions,
    tier: actions.some((a) => a.startsWith("hd_")) ? "hd" : "sd",
    overridden: true,
  };
}

/**
 * True when a task failure looks like "your plan does not include these actions" rather than a
 * problem with the photo — the only case where retrying on the SD action set makes sense.
 */
function isActionEntitlementError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("dst_action") ||
    m.includes("not support") ||
    m.includes("unsupported") ||
    m.includes("permission") ||
    m.includes("not allow") ||
    m.includes("unauthorized") ||
    m.includes("forbidden") ||
    m.includes("quota") ||
    m.includes("invalid parameter") ||
    m.includes("error_invalid_action")
  );
}

function deriveFileEndpoint(taskEndpoint: string): string {
  if (taskEndpoint.includes("/task/")) return taskEndpoint.replace("/task/", "/file/");
  return "/s2s/v2.1/file/skin-analysis";
}

export type PerfectSkinPipelineResult = {
  metrics: SkinMetrics;
  raw: unknown;
  analyzedMetricKeys: (keyof SkinMetrics)[];
  maskAssets: SkinMaskAsset[];
  /** Perfect's resized/aligned copy of the photo — the layer the masks line up with. */
  maskBaseUrl?: string;
  skinAge?: number;
  tier: "hd" | "sd";
};

/**
 * Full Skin Analysis flow per Perfect docs:
 * File metadata → PUT to presigned URL → POST task → GET poll until success.
 *
 * Runs the HD action set first so every rendered metric is measured; falls back to the SD triad
 * only when Perfect rejects the actions themselves (plan entitlement), never when it rejects the photo.
 */
export async function runPerfectSkinAnalysisPipeline(
  imageBuffer: ArrayBuffer,
  filename: string,
  contentType: string
): Promise<PerfectSkinPipelineResult> {
  const baseUrl = normalizePerfectBaseUrl(process.env.PERFECT_API_BASE_URL ?? "");
  const apiKey = process.env.PERFECT_API_KEY ?? "";
  const taskPath = process.env.PERFECT_SKIN_ANALYSIS_ENDPOINT?.trim() || "/s2s/v2.1/task/skin-analysis";
  const filePath = process.env.PERFECT_SKIN_FILE_ENDPOINT?.trim() || deriveFileEndpoint(taskPath);

  if (!baseUrl || !apiKey) {
    throw new Error("PERFECT_API_BASE_URL and PERFECT_API_KEY are required for skin analysis.");
  }

  const byteLength = imageBuffer.byteLength;
  const ct = contentType || "image/jpeg";
  const safeName = filename?.trim() ? filename.replace(/[^\w.\-]+/g, "_").slice(0, 200) : "scan.jpg";

  const fileRes = await fetch(`${baseUrl}${filePath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: [{ content_type: ct, file_name: safeName, file_size: byteLength }],
    }),
  });

  const fileJson = await fileRes.json().catch(() => ({}));
  if (!fileRes.ok) {
    throw new Error(`Perfect File API HTTP ${fileRes.status}: ${JSON.stringify(fileJson).slice(0, 400)}`);
  }
  const parsedFile = parseBody(fileJson);
  if (!parsedFile.ok || !parsedFile.data) {
    throw new Error(`Perfect File API error: ${parsedFile.message ?? JSON.stringify(fileJson).slice(0, 300)}`);
  }

  const files = parsedFile.data.files as unknown;
  if (!Array.isArray(files) || !files[0] || typeof files[0] !== "object") {
    throw new Error("Perfect File API: missing data.files[0]");
  }
  const first = files[0] as Record<string, unknown>;
  const fileId = first.file_id;
  const requests = first.requests as unknown;
  if (typeof fileId !== "string" || !Array.isArray(requests) || !requests[0]) {
    throw new Error("Perfect File API: missing file_id or requests");
  }
  const putReq = requests[0] as Record<string, unknown>;
  const putUrl = putReq.url;
  const putHeaders = (putReq.headers as Record<string, string>) ?? {};
  if (typeof putUrl !== "string") {
    throw new Error("Perfect File API: missing presigned PUT url");
  }

  const putResp = await fetch(putUrl, {
    method: "PUT",
    headers: putHeaders,
    body: imageBuffer,
  });
  if (!putResp.ok) {
    const t = await putResp.text().catch(() => "");
    throw new Error(`Perfect image upload (PUT) failed: HTTP ${putResp.status} ${t.slice(0, 200)}`);
  }

  const requested = getDstActions();

  try {
    const result = await runTaskAndPoll(baseUrl, apiKey, taskPath, fileId, requested.actions);
    return { ...result, tier: requested.tier };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    /**
     * HD needs a higher-resolution photo than SD. A phone selfie that is fine for SD is often
     * rejected by HD with error_below_min_image_size, so that specific rejection retries on SD
     * rather than failing a scan the account could have completed.
     */
    const tooSmallForHd =
      e instanceof PerfectSkinAnalysisRejectedError && e.code === "error_below_min_image_size";
    const notEntitled =
      !(e instanceof PerfectSkinAnalysisRejectedError) && isActionEntitlementError(message);
    const canFallBack =
      !requested.overridden && requested.tier === "hd" && (tooSmallForHd || notEntitled);

    if (!canFallBack) throw e;

    console.warn(
      `[skinAnalysis] HD set unavailable (${tooSmallForHd ? "image below HD minimum" : message.slice(0, 160)}); retrying on SD triad.`
    );
    const result = await runTaskAndPoll(baseUrl, apiKey, taskPath, fileId, [...SD_DST_ACTIONS]);
    return { ...result, tier: "sd" };
  }
}

/** POST one analysis task for `dstActions` against an already-uploaded file, then poll to completion. */
async function runTaskAndPoll(
  baseUrl: string,
  apiKey: string,
  taskPath: string,
  fileId: string,
  dstActions: string[]
): Promise<Omit<PerfectSkinPipelineResult, "tier">> {
  const taskBody: Record<string, unknown> = {
    src_file_id: fileId,
    dst_actions: dstActions,
    format: "json",
    miniserver_args: { enable_mask_overlay: true },
    pf_camera_kit: false,
  };

  const taskRes = await fetch(`${baseUrl}${taskPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskBody),
  });

  const taskJson = await taskRes.json().catch(() => ({}));
  if (!taskRes.ok) {
    throw new Error(`Perfect Task POST HTTP ${taskRes.status}: ${JSON.stringify(taskJson).slice(0, 500)}`);
  }
  const parsedTask = parseBody(taskJson);
  if (!parsedTask.ok || !parsedTask.data) {
    throw new Error(`Perfect Task API error: ${parsedTask.message ?? JSON.stringify(taskJson).slice(0, 300)}`);
  }
  const taskId = (parsedTask.data as { task_id?: string }).task_id;
  if (typeof taskId !== "string") {
    throw new Error("Perfect Task API: missing task_id");
  }

  const pollUrl = `${baseUrl}${taskPath}/${encodeURIComponent(taskId)}`;
  const maxAttempts = 45;
  const delayMs = 2000;
  let lastPayload: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, delayMs));
    else await new Promise((r) => setTimeout(r, 400));

    const statusRes = await fetch(pollUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const statusJson = await statusRes.json().catch(() => ({}));
    lastPayload = statusJson;
    if (!statusRes.ok) {
      throw new Error(`Perfect poll HTTP ${statusRes.status}: ${JSON.stringify(statusJson).slice(0, 400)}`);
    }

    const parsed = parseBody(statusJson);
    const data = parsed.ok ? parsed.data : undefined;
    if (!data) {
      throw new Error(`Perfect poll: could not parse body: ${JSON.stringify(statusJson).slice(0, 400)}`);
    }

    const { taskStatus, output } = extractPollState(data);

    if (taskStatus === "error" || taskStatus === "failed") {
      const code = String((data as { error?: string }).error ?? "");
      const hint =
        code === "error_src_face_too_small"
          ? "Perfect rejected this image: face is too small or resolution too low. Use a well-lit photo where your face fills most of the frame (short side at least ~480px for SD analysis)."
          : code === "error_src_face_out_of_bound"
            ? "Perfect rejected this image: face is off-center, cropped, or outside the safe region. Center your head, show your full face, and avoid tight crops."
            : code === "error_below_min_image_size"
              ? "Perfect rejected this image: resolution is below the minimum for this analysis tier. Use a photo at least ~1080px on the short side for HD analysis."
              : code || JSON.stringify(statusJson).slice(0, 500);
      throw new PerfectSkinAnalysisRejectedError(code || undefined, hint);
    }
    if (taskStatus === "success" || taskStatus === "complete") {
      if (!output.length) {
        throw new Error(
          `Perfect success but no output rows. Keys: ${Object.keys(data).join(",")} ${JSON.stringify(data).slice(0, 600)}`
        );
      }
      const { metrics, analyzedMetricKeys, maskAssets } = mapPerfectOutputToMetrics(output);
      return {
        metrics,
        raw: statusJson,
        analyzedMetricKeys,
        maskAssets,
        maskBaseUrl: readResizedBaseUrl(output),
        skinAge: readSkinAge(output),
      };
    }
  }

  throw new Error(`Perfect skin analysis timed out after polling (last: ${JSON.stringify(lastPayload).slice(0, 300)})`);
}
