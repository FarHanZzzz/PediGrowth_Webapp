import { createClient } from "./client";

export async function fetchResultFromCloud(resultId: string): Promise<Record<string, unknown> | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("hackathon_results")
    .select("payload")
    .eq("id", resultId)
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
      console.error("Error fetching from cloud:", error);
    }
    return null;
  }

  return data.payload as Record<string, unknown>;
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
