import type { SkinMetrics } from "@/lib/types";
import { PerfectSkinAnalysisRejectedError } from "@/lib/perfect/perfectSkinErrors";
import { neutralBaselineMetrics } from "@/lib/skin/skinScore";

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
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

function mapPerfectOutputToMetrics(output: Array<Record<string, unknown>>): {
  metrics: SkinMetrics;
  analyzedMetricKeys: (keyof SkinMetrics)[];
} {
  const metrics: SkinMetrics = neutralBaselineMetrics();
  const seen = new Set<keyof SkinMetrics>();
  for (const row of output) {
    const t = readConcernType(row).toLowerCase().replace(/-/g, "_");
    const key = PERFECT_TYPE_TO_METRIC[t];
    if (!key) continue;
    const v = readScore(row);
    if (v === undefined) continue;
    metrics[key] = clampScore(v);
    seen.add(key);
  }
  if (seen.size === 0) {
    throw new Error(
      `Perfect skin analysis returned no recognizable metric rows. Sample: ${JSON.stringify(output[0] ?? []).slice(0, 200)}`
    );
  }
  return { metrics, analyzedMetricKeys: [...seen] };
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

/** Default matches common playground SD triad; override with PERFECT_DST_ACTIONS (do not mix HD+SD). */
const DEFAULT_DST_ACTIONS = ["acne", "wrinkle", "age_spot"] as const;

function getDstActions(): string[] {
  const raw = process.env.PERFECT_DST_ACTIONS?.trim();
  if (!raw) return [...DEFAULT_DST_ACTIONS];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function deriveFileEndpoint(taskEndpoint: string): string {
  if (taskEndpoint.includes("/task/")) return taskEndpoint.replace("/task/", "/file/");
  return "/s2s/v2.1/file/skin-analysis";
}

export type PerfectSkinPipelineResult = {
  metrics: SkinMetrics;
  raw: unknown;
  analyzedMetricKeys: (keyof SkinMetrics)[];
};

/**
 * Full Skin Analysis flow per Perfect docs:
 * File metadata → PUT to presigned URL → POST task → GET poll until success.
 */
export async function runPerfectSkinAnalysisPipeline(
  imageBuffer: ArrayBuffer,
  filename: string,
  contentType: string
): Promise<PerfectSkinPipelineResult> {
  const baseUrl = normalizeBaseUrl(process.env.PERFECT_API_BASE_URL ?? "");
  const apiKey = process.env.PERFECT_API_KEY ?? "";
  const taskPath = process.env.PERFECT_SKIN_ANALYSIS_ENDPOINT ?? "";
  const filePath =
    process.env.PERFECT_SKIN_FILE_ENDPOINT?.trim() || (taskPath ? deriveFileEndpoint(taskPath) : "/s2s/v2.1/file/skin-analysis");

  if (!baseUrl || !apiKey || !taskPath) {
    throw new Error("PERFECT_API_BASE_URL, PERFECT_API_KEY, and PERFECT_SKIN_ANALYSIS_ENDPOINT are required");
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

  const taskBody: Record<string, unknown> = {
    src_file_id: fileId,
    dst_actions: getDstActions(),
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
            : code || JSON.stringify(statusJson).slice(0, 500);
      throw new PerfectSkinAnalysisRejectedError(code || undefined, hint);
    }
    if (taskStatus === "success" || taskStatus === "complete") {
      if (!output.length) {
        throw new Error(
          `Perfect success but no output rows. Keys: ${Object.keys(data).join(",")} ${JSON.stringify(data).slice(0, 600)}`
        );
      }
      const { metrics, analyzedMetricKeys } = mapPerfectOutputToMetrics(output);
      return { metrics, raw: statusJson, analyzedMetricKeys };
    }
  }

  throw new Error(`Perfect skin analysis timed out after polling (last: ${JSON.stringify(lastPayload).slice(0, 300)})`);
}
