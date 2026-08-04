import type { SupabaseClient } from "@supabase/supabase-js";
import { timeoutSignal } from "@/lib/fetchUtil";
import type { SkinMaskAsset } from "@/lib/types";

const MASK_FETCH_TIMEOUT_MS = 20_000;
/** Guard against a pathological response filling storage; overlays are small JPEGs. */
const MAX_MASK_BYTES = 8 * 1024 * 1024;

function extensionFor(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

/** Copy one Perfect image into our bucket, returning the durable public URL (null on any failure). */
async function copyToBucket(
  supabase: SupabaseClient,
  bucket: string,
  sourceUrl: string,
  pathWithoutExtension: string
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl, { signal: timeoutSignal(MASK_FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0) throw new Error("empty body");
    if (bytes.byteLength > MAX_MASK_BYTES) throw new Error(`image too large (${bytes.byteLength} bytes)`);

    const path = `${pathWithoutExtension}.${extensionFor(contentType)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType,
      upsert: true,
    });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (e) {
    console.warn(`[persistMasks] ${pathWithoutExtension} not persisted:`, e);
    return null;
  }
}

/**
 * Perfect returns mask overlays as presigned URLs that expire in ~2 hours, so a stored scan would
 * show broken images the same day. Copy each mask into our own bucket and rewrite the asset to the
 * durable URL. Any mask that fails to copy keeps its original URL and stays flagged ephemeral — a
 * mask that works for the rest of the session beats no mask at all.
 */
export async function persistMaskAssets(
  supabase: SupabaseClient,
  bucket: string,
  userId: string,
  scanStamp: string,
  masks: SkinMaskAsset[]
): Promise<SkinMaskAsset[]> {
  if (!masks.length) return masks;

  return Promise.all(
    masks.map(async (mask): Promise<SkinMaskAsset> => {
      const url = await copyToBucket(
        supabase,
        bucket,
        mask.url,
        `${userId}/masks/${scanStamp}-${mask.metricKey}`
      );
      return url ? { ...mask, url, isEphemeral: false } : mask;
    })
  );
}

/** Same treatment for Perfect's resized base image, which the overlays are aligned to. */
export async function persistMaskBaseImage(
  supabase: SupabaseClient,
  bucket: string,
  userId: string,
  scanStamp: string,
  baseUrl: string
): Promise<string> {
  const url = await copyToBucket(supabase, bucket, baseUrl, `${userId}/masks/${scanStamp}-base`);
  return url ?? baseUrl;
}
