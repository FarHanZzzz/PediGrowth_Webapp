import { createClient } from "./client";

export interface CloudResultRecord {
  id: string;
  payload: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function looksLikeAnalysisPayload(payload: Record<string, unknown>): boolean {
  return (
    "quality" in payload ||
    "concerns" in payload ||
    "session" in payload ||
    "assessmentMode" in payload
  );
}

function looksLikeLegacySharePacket(payload: Record<string, unknown>): boolean {
  return (
    typeof payload.assessment_ref === "string" &&
    "payload" in payload &&
    !looksLikeAnalysisPayload(payload)
  );
}

async function fetchPayloadById(
  resultId: string
): Promise<Record<string, unknown> | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("hackathon_results")
    .select("payload")
    .eq("id", resultId)
    .maybeSingle();

  if (error || !data) {
    if (error && error.code !== "PGRST116") {
      console.error("Error fetching from cloud:", error);
    }
    return null;
  }

  return asRecord(data.payload);
}

export async function fetchResultFromCloud(resultId: string): Promise<Record<string, unknown> | null> {
  const payload = await fetchPayloadById(resultId);
  if (!payload) {
    return null;
  }

  // Legacy share-link fallback stored share packets inside hackathon_results.
  // If this ID is actually a token hash row, resolve to the linked assessment.
  if (looksLikeLegacySharePacket(payload)) {
    const assessmentRef = payload.assessment_ref as string;
    if (assessmentRef && assessmentRef !== resultId) {
      const linked = await fetchPayloadById(assessmentRef);
      if (linked) {
        return linked;
      }
    }
    return null;
  }

  if (!looksLikeAnalysisPayload(payload)) {
    return null;
  }

  return payload;
}

export async function saveResultToCloud(resultId: string, payload: Record<string, unknown> | unknown): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("hackathon_results")
    .upsert({
      id: resultId,
      payload,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Error saving to cloud:", error);
    throw new Error("Failed to save result to Supabase");
  }
}

export async function fetchRecentResultsFromCloud(limit = 100): Promise<CloudResultRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("hackathon_results")
    .select("id,payload,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error listing cloud results:", error);
    return [];
  }

  return (data ?? []) as CloudResultRecord[];
}
