import { NextResponse } from "next/server";
import { analyzeFacialTone, analyzeSkin } from "@/lib/perfect/perfectClient";
import { getRequestUser } from "@/lib/auth/serverAuth";
import { calculateOverallScore, getTopConcerns } from "@/lib/skin/skinScore";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureAppUser } from "@/lib/supabase/ensureAppUser";
import { dbSkinScanToScanResponse, type SkinScansRow } from "@/lib/supabase/scanMapper";
import { PerfectSkinAnalysisRejectedError } from "@/lib/perfect/perfectSkinErrors";
import { wrapPerfectSkinRaw } from "@/lib/perfect/scanRawEnvelope";
import { persistMaskAssets, persistMaskBaseImage } from "@/lib/supabase/persistMasks";
import type { SkinMaskAsset, SkinMetrics } from "@/lib/types";

const BUCKET = "skin-scans";

function buildLocalPayload(
  scanId: string,
  imageUrl: string,
  scanDate: string,
  overallScore: number,
  metrics: Awaited<ReturnType<typeof analyzeSkin>>["metrics"],
  topConcerns: string[],
  isMock: boolean,
  facialToneData: Awaited<ReturnType<typeof analyzeFacialTone>>["facialToneData"],
  rawSkin: unknown,
  rawTone: unknown,
  analyzedMetricKeys?: (keyof SkinMetrics)[],
  maskAssets?: SkinMaskAsset[],
  analysisTier?: "hd" | "sd",
  maskBaseUrl?: string,
  skinAge?: number
) {
  return {
    scanId,
    id: scanId,
    userId: "local-fallback",
    imageUrl,
    scanDate,
    overallScore,
    metrics,
    topConcerns,
    summary: `${topConcerns.join(", ")} are the top areas to watch today.`,
    isMock,
    ...(analyzedMetricKeys?.length ? { analyzedMetricKeys } : {}),
    ...(maskAssets?.length ? { maskAssets } : {}),
    ...(analysisTier ? { analysisTier } : {}),
    ...(maskBaseUrl ? { maskBaseUrl } : {}),
    ...(skinAge !== undefined ? { skinAge } : {}),
    facialToneData,
    rawSkinAnalysisResponse: rawSkin,
    rawColorToneResponse: rawTone,
  };
}

function safeFilePart(name: string): string {
  const base = name?.trim() ? name.replace(/[^a-zA-Z0-9._-]/g, "_") : "scan";
  return base.slice(0, 120) || "scan.jpg";
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = user.id;

    const form = await request.formData();
    const file = form.get("image") as File | null;
    const scanDate = String(form.get("scanDate") ?? new Date().toISOString().slice(0, 10));
    if (!file) return NextResponse.json({ error: "image is required" }, { status: 400 });

    const fallbackScanId = `scan-${Date.now()}`;
    const mockImageUrl = `/mock/upload-${Date.now()}-${file.name || "scan.jpg"}`;
    const imageBuffer = await file.arrayBuffer();

    let skin: Awaited<ReturnType<typeof analyzeSkin>>;
    try {
      skin = await analyzeSkin({
        imageUrl: mockImageUrl,
        filename: file.name || "scan.jpg",
        imageBuffer,
        contentType: file.type || "image/jpeg",
      });
    } catch (e) {
      if (e instanceof PerfectSkinAnalysisRejectedError) {
        return NextResponse.json(
          { error: e.title, hint: e.hint, code: e.code ?? null },
          { status: 422 }
        );
      }
      throw e;
    }
    const tone = await analyzeFacialTone({
      imageUrl: mockImageUrl,
      filename: file.name,
      imageBuffer,
      contentType: file.type || "image/jpeg",
    });
    const analyzedKeys = skin.analyzedMetricKeys;
    const overallScore = calculateOverallScore(skin.metrics, analyzedKeys);
    const topConcerns = getTopConcerns(skin.metrics, 3, analyzedKeys);
    const isMock = skin.isMock;

    /** Rewritten below once masks are copied off Perfect's expiring presigned URLs. */
    let maskAssets = skin.maskAssets ?? [];
    let maskBaseUrl = skin.maskBaseUrl;
    const analysisTier = skin.analysisTier;
    const skinAge = skin.skinAge;

    const buildStoredRaw = () =>
      !isMock && analyzedKeys?.length
        ? wrapPerfectSkinRaw(skin.raw, analyzedKeys, { maskAssets, maskBaseUrl, skinAge, analysisTier })
        : skin.raw;

    const localFallback = () =>
      NextResponse.json(
        buildLocalPayload(
          fallbackScanId,
          mockImageUrl,
          scanDate,
          overallScore,
          skin.metrics,
          topConcerns,
          isMock,
          tone.facialToneData,
          buildStoredRaw(),
          tone.raw,
          analyzedKeys,
          maskAssets,
          analysisTier,
          maskBaseUrl,
          skinAge
        )
      );

    const supabase = getSupabaseAdminClient();
    if (!supabase) return localFallback();
    const ensuredUser = await ensureAppUser(supabase, user);
    if (!ensuredUser) {
      return NextResponse.json({ error: "Could not prepare user record for scan persistence." }, { status: 500 });
    }

    let imageUrl = mockImageUrl;
    const scanStamp = String(Date.now());
    try {
      const safeName = safeFilePart(file.name || "scan.jpg");
      const storagePath = `${userId}/scans/${scanStamp}-${safeName}`;
      const bytes = imageBuffer;
      const contentType = file.type || "image/jpeg";
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
        contentType,
        upsert: false,
      });
      if (uploadError) {
        console.warn("[POST /api/scans] Storage upload failed:", uploadError.message);
      } else {
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        if (pub?.publicUrl) imageUrl = pub.publicUrl;
      }
    } catch (e) {
      console.warn("[POST /api/scans] Storage upload unexpected error:", e);
    }

    if (maskAssets.length) {
      maskAssets = await persistMaskAssets(supabase, BUCKET, userId, scanStamp, maskAssets);
    }
    if (maskBaseUrl) {
      maskBaseUrl = await persistMaskBaseImage(supabase, BUCKET, userId, scanStamp, maskBaseUrl);
    }

    const storedSkinRaw = buildStoredRaw();

    try {
      const { data: inserted, error: insertError } = await supabase
        .from("skin_scans")
        .insert({
          user_id: userId,
          image_url: imageUrl,
          scan_date: scanDate,
          overall_score: overallScore,
          hydration_score: skin.metrics.hydration,
          redness_score: skin.metrics.redness,
          acne_score: skin.metrics.acne,
          pore_score: skin.metrics.pores,
          texture_score: skin.metrics.texture,
          wrinkle_score: skin.metrics.wrinkles,
          dark_circle_score: skin.metrics.darkCircles,
          pigmentation_score: skin.metrics.pigmentation,
          radiance_score: skin.metrics.radiance,
          oiliness_score: skin.metrics.oiliness,
          top_concerns: topConcerns,
          facial_tone_data: tone.facialToneData,
          raw_skin_analysis_response: storedSkinRaw,
          raw_color_tone_response: tone.raw,
          is_mock: isMock,
        })
        .select()
        .single();

      if (insertError || !inserted) {
        console.warn("[POST /api/scans] insert failed:", insertError?.message ?? "no row");
        return localFallback();
      }

      const mapped = dbSkinScanToScanResponse(inserted as SkinScansRow);
      return NextResponse.json({
        ...mapped,
        facialToneData: tone.facialToneData,
        rawSkinAnalysisResponse: storedSkinRaw,
        rawColorToneResponse: tone.raw,
        ...(analyzedKeys?.length ? { analyzedMetricKeys: analyzedKeys } : {}),
        ...(maskAssets.length ? { maskAssets } : {}),
        ...(analysisTier ? { analysisTier } : {}),
        ...(maskBaseUrl ? { maskBaseUrl } : {}),
        ...(skinAge !== undefined ? { skinAge } : {}),
      });
    } catch (e) {
      console.warn("[POST /api/scans] insert unexpected error:", e);
      return localFallback();
    }
  } catch (error) {
    if (error instanceof PerfectSkinAnalysisRejectedError) {
      return NextResponse.json(
        { error: error.title, hint: error.hint, code: error.code ?? null },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "scan failed", details: String(error) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("skin_scans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data?.length) {
        return NextResponse.json({
          scans: data.map((row) => dbSkinScanToScanResponse(row as SkinScansRow)),
        });
      }
      if (error) console.warn("[GET /api/scans] query failed:", error.message);
    } catch (e) {
      console.warn("[GET /api/scans] unexpected error:", e);
    }
  }
  return NextResponse.json({ scans: [] });
}
