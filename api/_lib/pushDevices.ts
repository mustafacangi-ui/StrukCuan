import type { SupabaseClient } from "@supabase/supabase-js";

/** Web push row shape (push_subscriptions / push_tokens). */
export type PushDeviceRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
};

let pushDevicesTableCache: string | null | undefined;

/** For tests / hot reload */
export function clearPushDevicesTableCache() {
  pushDevicesTableCache = undefined;
}

/**
 * Pick a working table: env PUSH_DEVICES_TABLE, then push_subscriptions (repo default), then push_tokens.
 */
export async function resolvePushDevicesTable(
  supabase: SupabaseClient
): Promise<string | null> {
  if (pushDevicesTableCache !== undefined) return pushDevicesTableCache;

  const explicit = process.env.PUSH_DEVICES_TABLE?.trim();
  const candidates = [explicit, "push_subscriptions", "push_tokens"].filter(
    (t, i, arr): t is string => Boolean(t) && arr.indexOf(t) === i
  );

  for (const table of candidates) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (!error) {
      console.log("[pushDevices] using table:", table);
      pushDevicesTableCache = table;
      return table;
    }
    console.warn("[pushDevices] probe failed:", table, JSON.stringify(error));
  }

  pushDevicesTableCache = null;
  return null;
}

const IN_BATCH = 120;

/**
 * Load push device rows. userIds === null → all rows (segment "all").
 * Batches .in("user_id", …) to avoid oversized PostgREST filters.
 */
export async function fetchPushDevicesForUsers(
  supabase: SupabaseClient,
  userIds: string[] | null
): Promise<PushDeviceRow[]> {
  const table = await resolvePushDevicesTable(supabase);
  if (!table) {
    console.error("[pushDevices] no table resolved — returning []");
    return [];
  }

  const cols = "id, endpoint, p256dh, auth, user_id";

  if (userIds === null) {
    const { data, error } = await supabase.from(table).select(cols);
    if (error) {
      console.error("[pushDevices] full-table select error:", JSON.stringify(error));
      return [];
    }
    return (data as PushDeviceRow[]) ?? [];
  }

  if (userIds.length === 0) return [];

  const out: PushDeviceRow[] = [];
  for (let i = 0; i < userIds.length; i += IN_BATCH) {
    const chunk = userIds.slice(i, i + IN_BATCH);
    const { data, error } = await supabase.from(table).select(cols).in("user_id", chunk);
    if (error) {
      console.error(
        "[pushDevices] batch error:",
        JSON.stringify(error),
        "chunkSize:",
        chunk.length,
        "sampleIds:",
        chunk.slice(0, 3)
      );
      continue;
    }
    if (data?.length) out.push(...(data as PushDeviceRow[]));
  }
  return out;
}

export async function deletePushDeviceById(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const table = await resolvePushDevicesTable(supabase);
  if (!table) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.error("[pushDevices] delete error:", JSON.stringify(error), "id:", id);
}
