import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchPushDevicesForUsers,
  resolvePushDevicesTable,
  type PushDeviceRow,
} from "./pushDevices.js";

/**
 * All valid push audience segment keys (keep in sync with UI + API validators).
 */
export const VALID_SEGMENTS = [
  "all",
  // legacy
  "inactive_users",
  "low_ticket_users",
  "indonesia_users",
  "survey_users",
  // new
  "active_today",
  "inactive_today",
  "zero_entries",
  "has_entries",
  "almost_entry",
  "pending_surveys",
  "near_red_label",
] as const;

export type Segment = (typeof VALID_SEGMENTS)[number];

/** Normalize user_id from uuid or text columns for consistent Set / .in() filters. */
export function normalizeUserId(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length ? s : null;
}

/** Returns YYYY-MM-DD for today in Jakarta (WIB, UTC+7). */
function jakartaDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function logSupabaseErr(ctx: string, err: unknown) {
  const e = err as { message?: string; code?: string; details?: string; hint?: string };
  console.error(`[resolveSegment] ${ctx} —`, JSON.stringify(e ?? {}));
}

/**
 * Resolves a segment name to a list of user_id strings.
 * Returns null when the segment targets ALL subscriptions (no user filter needed).
 * On any query failure, logs and returns [] (never throws).
 */
export async function resolveSegmentUserIds(
  supabase: SupabaseClient,
  segment: string
): Promise<string[] | null> {
  const today = jakartaDate();

  switch (segment) {
    case "all":
    case "near_red_label":
      return null;

    case "inactive_users": {
      try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const cutoff = threeDaysAgo.toISOString().slice(0, 10);
        const { data, error } = await supabase
          .from("user_stats")
          .select("user_id, last_upload_date");
        if (error) throw error;
        return (
          data
            ?.filter((u) => !u.last_upload_date || String(u.last_upload_date) < cutoff)
            .map((u) => normalizeUserId(u.user_id))
            .filter((id): id is string => !!id) ?? []
        );
      } catch (e) {
        logSupabaseErr("inactive_users", e);
        return [];
      }
    }

    case "low_ticket_users": {
      try {
        const { data, error } = await supabase
          .from("user_stats")
          .select("user_id, tiket")
          .lt("tiket", 5);
        if (error) throw error;
        return data?.map((u) => normalizeUserId(u.user_id)).filter((id): id is string => !!id) ?? [];
      } catch (e) {
        logSupabaseErr("low_ticket_users", e);
        return [];
      }
    }

    case "indonesia_users": {
      try {
        const { data, error } = await supabase
          .from("user_stats")
          .select("user_id")
          .eq("country_code", "ID");
        if (error) throw error;
        return data?.map((u) => normalizeUserId(u.user_id)).filter((id): id is string => !!id) ?? [];
      } catch (e) {
        logSupabaseErr("indonesia_users", e);
        return [];
      }
    }

    case "survey_users": {
      const ids = new Set<string>();
      try {
        const { data, error } = await supabase
          .from("survey_rewards")
          .select("user_id")
          .eq("status", "completed");
        if (error) throw error;
        for (const row of data ?? []) {
          const id = normalizeUserId(row.user_id);
          if (id) ids.add(id);
        }
      } catch (e) {
        logSupabaseErr("survey_users/survey_rewards", e);
      }
      try {
        const { data, error } = await supabase.from("survey_events").select("user_id");
        if (error) throw error;
        for (const row of data ?? []) {
          const id = normalizeUserId(row.user_id);
          if (id) ids.add(id);
        }
      } catch (e) {
        logSupabaseErr("survey_users/survey_events", e);
      }
      return Array.from(ids);
    }

    case "active_today": {
      try {
        const { data, error } = await supabase
          .from("user_stats")
          .select("user_id, last_upload_date")
          .eq("last_upload_date", today);
        if (error) throw error;
        return data?.map((u) => normalizeUserId(u.user_id)).filter((id): id is string => !!id) ?? [];
      } catch (e) {
        logSupabaseErr("active_today", e);
        return [];
      }
    }

    case "inactive_today": {
      try {
        const { data, error } = await supabase.from("user_stats").select("user_id, last_upload_date");
        if (error) throw error;
        return (
          data
            ?.filter((u) => !u.last_upload_date || String(u.last_upload_date) !== today)
            .map((u) => normalizeUserId(u.user_id))
            .filter((id): id is string => !!id) ?? []
        );
      } catch (e) {
        logSupabaseErr("inactive_today", e);
        return [];
      }
    }

    case "zero_entries": {
      try {
        const { data, error } = await supabase.from("user_stats").select("user_id, tiket").lt("tiket", 10);
        if (error) throw error;
        return data?.map((u) => normalizeUserId(u.user_id)).filter((id): id is string => !!id) ?? [];
      } catch (e) {
        logSupabaseErr("zero_entries", e);
        return [];
      }
    }

    case "has_entries": {
      try {
        const { data, error } = await supabase.from("user_stats").select("user_id, tiket").gte("tiket", 10);
        if (error) throw error;
        return data?.map((u) => normalizeUserId(u.user_id)).filter((id): id is string => !!id) ?? [];
      } catch (e) {
        logSupabaseErr("has_entries", e);
        return [];
      }
    }

    case "almost_entry": {
      try {
        const { data, error } = await supabase.from("user_stats").select("user_id, tiket").gt("tiket", 0);
        if (error) throw error;
        return (
          data
            ?.filter((u) => Number(u.tiket) % 10 >= 8)
            .map((u) => normalizeUserId(u.user_id))
            .filter((id): id is string => !!id) ?? []
        );
      } catch (e) {
        logSupabaseErr("almost_entry", e);
        return [];
      }
    }

    case "pending_surveys": {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const since = sevenDaysAgo.toISOString();
      const completedSet = new Set<string>();

      try {
        const { data, error } = await supabase
          .from("survey_rewards")
          .select("user_id")
          .eq("status", "completed")
          .gte("created_at", since);
        if (error) throw error;
        for (const row of data ?? []) {
          const id = normalizeUserId(row.user_id);
          if (id) completedSet.add(id);
        }
      } catch (e) {
        logSupabaseErr("pending_surveys/survey_rewards", e);
      }

      try {
        const { data, error } = await supabase
          .from("survey_events")
          .select("user_id")
          .gte("created_at", since);
        if (error) throw error;
        for (const row of data ?? []) {
          const id = normalizeUserId(row.user_id);
          if (id) completedSet.add(id);
        }
      } catch (e) {
        logSupabaseErr("pending_surveys/survey_events", e);
      }

      try {
        const { data, error } = await supabase.from("user_stats").select("user_id");
        if (error) throw error;
        return (
          data
            ?.map((u) => normalizeUserId(u.user_id))
            .filter((id): id is string => !!id && !completedSet.has(id)) ?? []
        );
      } catch (e) {
        logSupabaseErr("pending_surveys/user_stats", e);
        return [];
      }
    }

    default:
      console.warn(`[resolveSegment] Unknown segment "${segment}", targeting all`);
      return null;
  }
}

export type FetchSubscriptionsResult = {
  subscriptions: PushDeviceRow[];
  /** null = no user filter (all devices); number = size of resolved id list */
  resolvedUserCount: number | null;
  pushDevicesTable: string | null;
};

/**
 * Fetch push device rows for a segment. Never throws; returns empty list on failure.
 */
export async function fetchSubscriptionsForSegment(
  supabase: SupabaseClient,
  segment: string
): Promise<FetchSubscriptionsResult> {
  let userIds: string[] | null;
  try {
    userIds = await resolveSegmentUserIds(supabase, segment);
  } catch (e) {
    logSupabaseErr("resolveSegmentUserIds(top)", e);
    userIds = [];
  }

  const normalized =
    userIds === null ? null : userIds.map((id) => normalizeUserId(id)).filter((id): id is string => !!id);

  const resolvedCount = normalized === null ? null : normalized.length;
  const preview = (normalized ?? []).slice(0, 3);

  console.log(
    "[resolveSegment] segment:",
    segment,
    "resolvedUserCount:",
    resolvedCount === null ? "ALL (no filter)" : resolvedCount,
    "sampleUserIds:",
    JSON.stringify(preview)
  );

  try {
    const subscriptions = await fetchPushDevicesForUsers(supabase, normalized);
    const pushDevicesTable = await resolvePushDevicesTable(supabase);

    console.log(
      "[resolveSegment] devices loaded:",
      subscriptions.length,
      "table:",
      pushDevicesTable ?? "(none)"
    );

    return { subscriptions, resolvedUserCount: resolvedCount, pushDevicesTable };
  } catch (e) {
    logSupabaseErr("fetchPushDevicesForUsers", e);
    return { subscriptions: [], resolvedUserCount: resolvedCount, pushDevicesTable: null };
  }
}
