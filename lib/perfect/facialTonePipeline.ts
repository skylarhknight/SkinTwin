import { timeoutSignal } from "@/lib/fetchUtil";
import type { FacialToneData } from "@/lib/types";

const FETCH_TIMEOUT_MS = 45_000;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
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

function deriveFileEndpoint(taskEndpoint: string): string {
  if (taskEndpoint.includes("/task/")) return taskEndpoint.replace("/task/", "/file/");
  return "/s2s/v2.1/file/facial-color-tones";
}

function pickNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function pickUndertone(row: Record<string, unknown>): string | undefined {
  const cands = [row.undertone, row.tone, row.label, row.result, row.value, row.name];
  for (const c of cands) {
    if (typeof c === "string" && c.trim()) return c.trim().toLowerCase();
  }
  return undefined;
}

function extractOutputRows(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") return [];
  const o = payload as Record<string, unknown>;
  const data = (o.data as Record<string, unknown> | undefined) ?? o;
  const results = (data.results as Record<string, unknown> | undefined) ?? data;
  const candidates = [results.output, results.outputs, data.output, data.outputs];
  for (const c of candidates) {
    if (Array.isArray(c)) return c.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === "object"));
  }
  return [];
}

function mapTone(rows: Array<Record<string, unknown>>): FacialToneData {
  let undertone: string | undefined;
  let pigmentationIndex: number | undefined;
  let rednessIndex: number | undefined;

  for (const row of rows) {
    const type = String(row.type ?? row.dst_action ?? row.name ?? row.category ?? "")
      .toLowerCase()
      .replace(/-/g, "_");
    const score =
      pickNumber(row.ui_score) ??
      pickNumber(row.score) ??
      pickNumber(row.raw_score) ??
      pickNumber(row.value) ??
      pickNumber(row.index);

    if (!undertone && (type.includes("undertone") || type.includes("tone"))) {
      undertone = pickUndertone(row) ?? undertone;
    }
    if (pigmentationIndex === undefined && (type.includes("pigment") || type.includes("spot"))) {
      pigmentationIndex = score;
    }
    if (rednessIndex === undefined && type.includes("red")) {
      rednessIndex = score;
    }
  }

  return {
    undertone: undertone ?? "neutral",
    pigmentationIndex: Math.max(0, Math.min(100, Math.round(pigmentationIndex ?? 50))),
    rednessIndex: Math.max(0, Math.min(100, Math.round(rednessIndex ?? 50))),
  };
}

export type PerfectFacialTonePipelineResult = {
  facialToneData: FacialToneData;
  raw: unknown;
};

export async function runPerfectFacialTonePipeline(
  imageBuffer: ArrayBuffer,
  filename: string,
  contentType: string
): Promise<PerfectFacialTonePipelineResult> {
  const baseUrl = normalizeBaseUrl(process.env.PERFECT_API_BASE_URL ?? "");
  const apiKey = process.env.PERFECT_API_KEY ?? "";
  const taskPath = process.env.PERFECT_FACIAL_TONE_ENDPOINT?.trim() ?? "";
  const filePath = process.env.PERFECT_FACIAL_TONE_FILE_ENDPOINT?.trim() || deriveFileEndpoint(taskPath);
  if (!baseUrl || !apiKey || !taskPath) {
    throw new Error("PERFECT_API_BASE_URL, PERFECT_API_KEY, and PERFECT_FACIAL_TONE_ENDPOINT are required");
  }

  const safeName = filename?.trim() ? filename.replace(/[^\w.\-]+/g, "_").slice(0, 200) : "scan.jpg";

  const fileRes = await fetch(`${baseUrl}${filePath}`, {
    method: "POST",
    signal: timeoutSignal(FETCH_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: [{ content_type: contentType || "image/jpeg", file_name: safeName, file_size: imageBuffer.byteLength }],
    }),
  });
  const fileJson = await fileRes.json().catch(() => ({}));
  if (!fileRes.ok) throw new Error(`Perfect facial tone file API HTTP ${fileRes.status}: ${JSON.stringify(fileJson).slice(0, 400)}`);
  const parsedFile = parseBody(fileJson);
  if (!parsedFile.ok || !parsedFile.data) throw new Error(`Perfect facial tone file API error: ${parsedFile.message ?? "invalid body"}`);

  const files = parsedFile.data.files as unknown;
  if (!Array.isArray(files) || !files[0] || typeof files[0] !== "object") throw new Error("Perfect facial tone file API: missing data.files[0]");
  const first = files[0] as Record<string, unknown>;
  const fileId = first.file_id;
  const putReq = Array.isArray(first.requests) ? (first.requests[0] as Record<string, unknown>) : null;
  const putUrl = putReq?.url;
  const putHeaders = (putReq?.headers as Record<string, string>) ?? {};
  if (typeof fileId !== "string" || typeof putUrl !== "string") throw new Error("Perfect facial tone file API: missing file_id or PUT url");

  const putResp = await fetch(putUrl, {
    method: "PUT",
    signal: timeoutSignal(FETCH_TIMEOUT_MS),
    headers: putHeaders,
    body: imageBuffer,
  });
  if (!putResp.ok) throw new Error(`Perfect facial tone upload failed: HTTP ${putResp.status}`);

  const taskRes = await fetch(`${baseUrl}${taskPath}`, {
    method: "POST",
    signal: timeoutSignal(FETCH_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ src_file_id: fileId, format: "json" }),
  });
  const taskJson = await taskRes.json().catch(() => ({}));
  if (!taskRes.ok) throw new Error(`Perfect facial tone task HTTP ${taskRes.status}: ${JSON.stringify(taskJson).slice(0, 400)}`);
  const parsedTask = parseBody(taskJson);
  const taskId = parsedTask.data?.task_id;
  if (!parsedTask.ok || typeof taskId !== "string") throw new Error("Perfect facial tone task API: missing task_id");

  const pollUrl = `${baseUrl}${taskPath}/${encodeURIComponent(taskId)}`;
  let last: unknown = null;
  for (let attempt = 0; attempt < 36; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(pollUrl, {
      method: "GET",
      signal: timeoutSignal(FETCH_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    const pollJson = await pollRes.json().catch(() => ({}));
    last = pollJson;
    if (!pollRes.ok && pollRes.status !== 404) throw new Error(`Perfect facial tone poll HTTP ${pollRes.status}`);

    const parsedPoll = parseBody(pollJson);
    if (!parsedPoll.ok || !parsedPoll.data) continue;
    const data = parsedPoll.data;
    const taskStatus = String(data.task_status ?? data.taskStatus ?? (data.results as Record<string, unknown> | undefined)?.task_status ?? "").toLowerCase();
    if (taskStatus === "error" || taskStatus === "failed") throw new Error(`Perfect facial tone task failed: ${String(data.error ?? "unknown")}`);

    const rows = extractOutputRows(pollJson);
    if (rows.length > 0) {
      return { facialToneData: mapTone(rows), raw: pollJson };
    }
  }
  throw new Error(`Perfect facial tone timed out waiting for output (last: ${JSON.stringify(last).slice(0, 300)})`);
}
