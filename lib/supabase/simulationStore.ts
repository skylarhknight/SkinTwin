import type { SupabaseClient } from "@supabase/supabase-js";
import type { SimulationResponse, SimulationScenario } from "@/lib/types";

export const SIMULATION_BUCKET = "simulations";

/** Minimal shape of a simulations row from Supabase (snake_case). */
export type SimulationsRow = {
  id: string;
  user_id: string;
  source_scan_id: string | null;
  scenario_type: string;
  source_image_url: string;
  simulated_image_url: string;
  simulation_years: number | null;
  scenario_description: string | null;
  raw_api_response: unknown;
  is_mock: boolean | null;
  created_at?: string;
};

export function dbSimulationToResponse(row: SimulationsRow): SimulationResponse {
  return {
    simulationId: String(row.id),
    scenarioType: row.scenario_type as SimulationScenario,
    sourceImageUrl: String(row.source_image_url),
    simulatedImageUrl: String(row.simulated_image_url),
    scenarioDescription: String(row.scenario_description ?? ""),
    simulationYears: Number(row.simulation_years ?? 20),
    isMock: Boolean(row.is_mock),
  };
}

function extensionFor(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

/**
 * Copies a Perfect-hosted result image into Supabase Storage.
 *
 * Perfect returns a short-lived signed download URL, so a stored row that points
 * at it goes dead within hours. Returns the durable public URL, or null when the
 * copy fails (caller falls back to the original URL).
 */
export async function mirrorSimulationImage(
  supabase: SupabaseClient,
  userId: string,
  remoteUrl: string
): Promise<string | null> {
  if (!/^https?:\/\//i.test(remoteUrl)) return null;
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) {
      console.warn("[mirrorSimulationImage] download failed:", res.status);
      return null;
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const bytes = Buffer.from(await res.arrayBuffer());
    const path = `${userId}/simulations/${Date.now()}.${extensionFor(contentType)}`;

    const { error } = await supabase.storage
      .from(SIMULATION_BUCKET)
      .upload(path, bytes, { contentType, upsert: false });
    if (error) {
      console.warn("[mirrorSimulationImage] upload failed:", error.message);
      return null;
    }

    const { data: pub } = supabase.storage.from(SIMULATION_BUCKET).getPublicUrl(path);
    return pub?.publicUrl ?? null;
  } catch (e) {
    console.warn("[mirrorSimulationImage] unexpected error:", e);
    return null;
  }
}

/**
 * Stores a generated simulation. Mirrors the result image first so the row stays
 * viewable after Perfect's URL expires. Returns the simulation with its database
 * id, or the input unchanged if persistence fails.
 */
export async function persistSimulation(
  supabase: SupabaseClient,
  userId: string,
  simulation: SimulationResponse,
  options: { sourceScanId?: string | null; rawApiResponse?: unknown } = {}
): Promise<SimulationResponse> {
  try {
    let simulatedImageUrl = simulation.simulatedImageUrl;
    if (!simulation.isMock) {
      const mirrored = await mirrorSimulationImage(supabase, userId, simulatedImageUrl);
      if (mirrored) simulatedImageUrl = mirrored;
    }

    const { data, error } = await supabase
      .from("simulations")
      .insert({
        user_id: userId,
        source_scan_id: options.sourceScanId ?? null,
        scenario_type: simulation.scenarioType,
        source_image_url: simulation.sourceImageUrl,
        simulated_image_url: simulatedImageUrl,
        simulation_years: simulation.simulationYears,
        scenario_description: simulation.scenarioDescription,
        raw_api_response: options.rawApiResponse ?? null,
        is_mock: simulation.isMock,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.warn("[persistSimulation] insert failed:", error?.message ?? "no row");
      return { ...simulation, simulatedImageUrl };
    }

    return {
      ...dbSimulationToResponse(data as SimulationsRow),
      ...(simulation.mockFallbackNote ? { mockFallbackNote: simulation.mockFallbackNote } : {}),
    };
  } catch (e) {
    console.warn("[persistSimulation] unexpected error:", e);
    return simulation;
  }
}

/** Reads the user's stored simulations, newest first. */
export async function readSimulations(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<SimulationResponse[]> {
  try {
    const { data, error } = await supabase
      .from("simulations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => dbSimulationToResponse(r as SimulationsRow));
  } catch {
    return [];
  }
}
