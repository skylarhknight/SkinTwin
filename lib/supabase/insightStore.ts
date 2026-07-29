import type { SupabaseClient } from "@supabase/supabase-js";
import type { Insight } from "@/lib/types";

/** Minimal shape of an insights row from Supabase (snake_case). */
export type InsightsRow = {
  id: string;
  user_id: string;
  insight_type: string;
  title: string;
  description: string;
  evidence: unknown;
  recommended_action: string | null;
  confidence: string | null;
  severity: string | null;
  related_scan_id: string | null;
  created_at?: string;
  expires_at?: string | null;
};

function toConfidence(v: unknown): Insight["confidence"] {
  return v === "low" || v === "high" ? v : "medium";
}

function toSeverity(v: unknown): Insight["severity"] | undefined {
  return v === "low" || v === "medium" || v === "high" ? v : undefined;
}

function toEvidence(v: unknown): Insight["evidence"] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (v && typeof v === "object") return v as Record<string, unknown>;
  return [];
}

export function dbInsightToInsight(row: InsightsRow): Insight {
  return {
    id: String(row.id),
    insightType: String(row.insight_type),
    title: String(row.title),
    description: String(row.description),
    evidence: toEvidence(row.evidence),
    recommendedAction: String(row.recommended_action ?? ""),
    confidence: toConfidence(row.confidence),
    ...(toSeverity(row.severity) ? { severity: toSeverity(row.severity) } : {}),
  };
}

/**
 * Writes the current insight set as the user's stored snapshot.
 *
 * Insights are recomputed deterministically from scans/habits/products, so this
 * upserts on (user_id, insight_type, title) to keep ids and created_at stable
 * across regenerations, then prunes rows that are no longer being produced.
 * Returns the persisted insights (with database ids), or the input unchanged if
 * persistence fails — the caller should still be able to serve the page.
 */
export async function persistInsights(
  supabase: SupabaseClient,
  userId: string,
  insights: Insight[],
  relatedScanId?: string | null
): Promise<Insight[]> {
  try {
    if (insights.length === 0) {
      await supabase.from("insights").delete().eq("user_id", userId);
      return [];
    }

    const rows = insights.map((i) => ({
      user_id: userId,
      insight_type: i.insightType,
      title: i.title,
      description: i.description,
      evidence: i.evidence ?? [],
      recommended_action: i.recommendedAction ?? null,
      confidence: i.confidence ?? null,
      severity: i.severity ?? null,
      related_scan_id: relatedScanId ?? null,
    }));

    const { data, error } = await supabase
      .from("insights")
      .upsert(rows, { onConflict: "user_id,insight_type,title" })
      .select("*");

    if (error || !data) {
      console.warn("[persistInsights] upsert failed:", error?.message ?? "no rows");
      return insights;
    }

    const keepIds = data.map((r) => `"${String((r as InsightsRow).id)}"`);
    const { error: pruneError } = await supabase
      .from("insights")
      .delete()
      .eq("user_id", userId)
      .not("id", "in", `(${keepIds.join(",")})`);
    if (pruneError) console.warn("[persistInsights] prune failed:", pruneError.message);

    return data.map((r) => dbInsightToInsight(r as InsightsRow));
  } catch (e) {
    console.warn("[persistInsights] unexpected error:", e);
    return insights;
  }
}

/** Reads the user's stored insight snapshot, newest first. */
export async function readStoredInsights(
  supabase: SupabaseClient,
  userId: string
): Promise<Insight[]> {
  try {
    const { data, error } = await supabase
      .from("insights")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((r) => dbInsightToInsight(r as InsightsRow));
  } catch {
    return [];
  }
}
