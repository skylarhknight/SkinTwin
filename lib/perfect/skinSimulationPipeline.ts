import type { SimulationScenario } from "@/lib/types";
import { timeoutSignal } from "@/lib/fetchUtil";
import { normalizePerfectBaseUrl } from "@/lib/perfect/baseUrl";

const FETCH_TIMEOUT_MS = 45_000;

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

function deriveSimulationFileEndpoint(taskEndpoint: string): string {
  if (taskEndpoint.includes("/task/")) return taskEndpoint.replace("/task/", "/file/");
  return "/s2s/v2.0/file/skin-simulation";
}

/** Perfect AI Skin Simulation intensities (0–1); distinct profiles so scenarios don’t look identical. */
function simulationIntensities(scenario: SimulationScenario): Record<string, number> {
  const base = {
    wrinkle: 0.35,
    radiance: 0.4,
    oiliness: 0.25,
    acne: 0.3,
    eye_bags: 0.35,
    dark_circle: 0.35,
    spots: 0.35,
    pores: 0.35,
    texture: 0.38,
    redness: 0.35,
  };
  switch (scenario) {
    case "consistent_spf_routine":
      return {
        ...base,
        wrinkle: 0.42,
        radiance: 0.55,
        texture: 0.48,
        spots: 0.38,
        pores: 0.4,
        redness: 0.32,
      };
    case "skip_spf":
      return {
        ...base,
        wrinkle: 0.62,
        spots: 0.58,
        redness: 0.52,
        radiance: 0.28,
        texture: 0.45,
      };
    case "stop_routine":
      return {
        ...base,
        wrinkle: 0.72,
        texture: 0.58,
        radiance: 0.22,
        acne: 0.45,
        spots: 0.55,
      };
    case "current_trajectory":
    default:
      return {
        ...base,
        wrinkle: 0.48,
        radiance: 0.42,
        texture: 0.42,
        spots: 0.42,
      };
  }
}

function extractResultDownloadUrl(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const o = json as Record<string, unknown>;
  const pick = (v: unknown): string | undefined =>
    typeof v === "string" && /^https?:\/\//i.test(v) ? v : undefined;
  const pickFromArray = (v: unknown): string | undefined => {
    if (!Array.isArray(v)) return undefined;
    for (const item of v) {
      if (!item || typeof item !== "object") continue;
      const found = pick((item as Record<string, unknown>).url);
      if (found) return found;
    }
    return undefined;
  };

  const direct = pick(o.url);
  if (direct) return direct;

  const data = o.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const fromData = pick(d.url) ?? pick(d.result_url) ?? pick(d.download_url);
    if (fromData) return fromData;

    // Common Perfect poll shape: { data: { results: { output: [{ url }] } } }
    const dResults = d.results;
    if (dResults && typeof dResults === "object") {
      const dr = dResults as Record<string, unknown>;
      const nestedFromDataResults =
        pick(dr.url) ??
        pick(dr.result_url) ??
        pick(dr.download_url) ??
        pickFromArray(dr.output) ??
        pickFromArray(dr.outputs) ??
        pickFromArray(dr.result) ??
        pickFromArray(dr.results);
      if (nestedFromDataResults) return nestedFromDataResults;
    }
  }

  const results = o.results;
  if (results && typeof results === "object") {
    const r = results as Record<string, unknown>;
    const nested =
      pick(r.url) ??
      pick(r.result_url) ??
      pick(r.download_url) ??
      pickFromArray(r.output) ??
      pickFromArray(r.outputs) ??
      pickFromArray(r.result) ??
      pickFromArray(r.results);
    if (nested) return nested;
  }

  return undefined;
}

function extractPollFailure(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const o = json as Record<string, unknown>;
  const data = (o.data ?? o.results) as Record<string, unknown> | undefined;
  const taskStatus = String(
    data?.task_status ?? data?.taskStatus ?? o.task_status ?? o.taskStatus ?? ""
  ).toLowerCase();
  if (taskStatus === "error" || taskStatus === "failed") {
    return String(data?.error ?? o.error ?? data?.message ?? "Skin simulation task failed");
  }
  return undefined;
}

export type SkinSimulationPipelineResult = {
  resultImageUrl: string;
  rawTaskPost: unknown;
  rawPollSuccess: unknown;
};

/**
 * Perfect AI Skin Simulation (v2.0): File → PUT → Task → poll GET until result URL.
 * Docs: https://docs.perfectcorp.com/reference/ai_skin_simulation
 */
export async function runPerfectSkinSimulationPipeline(
  imageBuffer: ArrayBuffer,
  filename: string,
  contentType: string,
  scenario: SimulationScenario
): Promise<SkinSimulationPipelineResult> {
  const baseUrl = normalizePerfectBaseUrl(process.env.PERFECT_API_BASE_URL ?? "");
  const apiKey = process.env.PERFECT_API_KEY ?? "";
  const taskPath =
    process.env.PERFECT_SKIN_SIMULATION_TASK_ENDPOINT?.trim() ||
    process.env.PERFECT_AGING_SIMULATION_ENDPOINT?.trim() ||
    "/s2s/v2.0/task/skin-simulation";
  const filePath =
    process.env.PERFECT_SKIN_SIMULATION_FILE_ENDPOINT?.trim() || deriveSimulationFileEndpoint(taskPath);

  if (!baseUrl || !apiKey) {
    throw new Error("PERFECT_API_BASE_URL and PERFECT_API_KEY are required for skin simulation.");
  }

  const byteLength = imageBuffer.byteLength;
  const ct = contentType || "image/jpeg";
  const safeName = filename?.trim() ? filename.replace(/[^\w.\-]+/g, "_").slice(0, 200) : "scan.jpg";

  const fileRes = await fetch(`${baseUrl}${filePath}`, {
    method: "POST",
    signal: timeoutSignal(FETCH_TIMEOUT_MS),
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
    throw new Error(`Perfect Skin Simulation File API HTTP ${fileRes.status}: ${JSON.stringify(fileJson).slice(0, 400)}`);
  }
  const parsedFile = parseBody(fileJson);
  if (!parsedFile.ok || !parsedFile.data) {
    throw new Error(`Perfect Skin Simulation File API error: ${parsedFile.message ?? JSON.stringify(fileJson).slice(0, 300)}`);
  }

  const files = parsedFile.data.files as unknown;
  if (!Array.isArray(files) || !files[0] || typeof files[0] !== "object") {
    throw new Error("Perfect Skin Simulation File API: missing data.files[0]");
  }
  const first = files[0] as Record<string, unknown>;
  const fileId = first.file_id;
  const requests = first.requests as unknown;
  if (typeof fileId !== "string" || !Array.isArray(requests) || !requests[0]) {
    throw new Error("Perfect Skin Simulation File API: missing file_id or requests");
  }
  const putReq = requests[0] as Record<string, unknown>;
  const putUrl = putReq.url;
  const putHeaders = (putReq.headers as Record<string, string>) ?? {};
  if (typeof putUrl !== "string") {
    throw new Error("Perfect Skin Simulation File API: missing presigned PUT url");
  }

  const putResp = await fetch(putUrl, {
    method: "PUT",
    signal: timeoutSignal(FETCH_TIMEOUT_MS),
    headers: putHeaders,
    body: imageBuffer,
  });
  if (!putResp.ok) {
    const t = await putResp.text().catch(() => "");
    throw new Error(`Perfect Skin Simulation upload (PUT) failed: HTTP ${putResp.status} ${t.slice(0, 200)}`);
  }

  const intensities = simulationIntensities(scenario);
  const taskBody: Record<string, unknown> = {
    src_file_id: fileId,
    ...intensities,
  };

  const taskRes = await fetch(`${baseUrl}${taskPath}`, {
    method: "POST",
    signal: timeoutSignal(FETCH_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(taskBody),
  });

  const taskJson = await taskRes.json().catch(() => ({}));
  if (!taskRes.ok) {
    throw new Error(`Perfect Skin Simulation Task POST HTTP ${taskRes.status}: ${JSON.stringify(taskJson).slice(0, 500)}`);
  }
  const parsedTask = parseBody(taskJson);
  if (!parsedTask.ok || !parsedTask.data) {
    throw new Error(`Perfect Skin Simulation Task API error: ${parsedTask.message ?? JSON.stringify(taskJson).slice(0, 300)}`);
  }
  const taskId = (parsedTask.data as { task_id?: string }).task_id;
  if (typeof taskId !== "string") {
    throw new Error("Perfect Skin Simulation Task API: missing task_id");
  }

  const pollUrl = `${baseUrl}${taskPath}/${encodeURIComponent(taskId)}`;
  const maxAttempts = 36;
  const delayMs = 2000;
  let lastPoll: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, delayMs));

    const statusRes = await fetch(pollUrl, {
      method: "GET",
      signal: timeoutSignal(FETCH_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const statusJson = await statusRes.json().catch(() => ({}));
    lastPoll = statusJson;

    const failReason = extractPollFailure(statusJson);
    if (failReason) {
      throw new Error(`Perfect Skin Simulation: ${failReason}`);
    }

    const url = extractResultDownloadUrl(statusJson);
    if (url) {
      return {
        resultImageUrl: url,
        rawTaskPost: taskJson,
        rawPollSuccess: statusJson,
      };
    }

    if (!statusRes.ok && statusRes.status !== 404) {
      throw new Error(`Perfect Skin Simulation poll HTTP ${statusRes.status}: ${JSON.stringify(statusJson).slice(0, 400)}`);
    }
  }

  throw new Error(`Perfect Skin Simulation timed out waiting for result URL (last: ${JSON.stringify(lastPoll).slice(0, 350)})`);
}
