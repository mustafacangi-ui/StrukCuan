import type { SupabaseClient } from "@supabase/supabase-js";

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

/** Returns YYYY-MM-DD for today in Jakarta (WIB, UTC+7). */
function jakartaDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

/**
 * Resolves a segment name to a list of user_id strings.
 * Returns null when the segment targets ALL subscriptions (no user filter needed).
 */
export async function resolveSegmentUserIds(
  supabase: SupabaseClient,
  segment: string
): Promise<string[] | null> {
  const today = jakartaDate();

  switch (segment) {
    // ── "all" and location-based fallback to null (target every subscription) ──
    case "all":
    case "near_red_label":
      return null;

    // ── legacy ──
    case "inactive_users": {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const { data } = await supabase
        .from("user_stats")
        .select("user_id, last_upload_date");
      const cutoff = threeDaysAgo.toISOString().slice(0, 10);
      return (
        data
          ?.filter((u) => !u.last_upload_date || u.last_upload_date < cutoff)
          .map((u) => u.user_id) ?? []
      );
    }

    case "low_ticket_users": {
      const { data } = await supabase
        .from("user_stats")
        .select("user_id, tiket")
        .lt("tiket", 5);
      return data?.map((u) => u.user_id) ?? [];
    }

    case "indonesia_users": {
      const { data } = await supabase
        .from("user_stats")
        .select("user_id")
        .eq("country_code", "ID");
      return data?.map((u) => u.user_id) ?? [];
    }

    case "survey_users": {
      const { data } = await supabase
        .from("survey_rewards")
        .select("user_id")
        .eq("status", "completed");
      return Array.from(new Set(data?.map((u) => u.user_id) ?? []));
    }

    // ── new segments ──
    case "active_today": {
      const { data } = await supabase
        .from("user_stats")
        .select("user_id, last_upload_date")
        .eq("last_upload_date", today);
      return data?.map((u) => u.user_id) ?? [];
    }

    case "inactive_today": {
      const { data } = await supabase
        .from("user_stats")
        .select("user_id, last_upload_date");
      return (
        data
          ?.filter((u) => !u.last_upload_date || u.last_upload_date !== today)
          .map((u) => u.user_id) ?? []
      );
    }

    case "zero_entries": {
      const { data } = await supabase
        .from("user_stats")
        .select("user_id, tiket")
        .lt("tiket", 10);
      return data?.map((u) => u.user_id) ?? [];
    }

    case "has_entries": {
      const { data } = await supabase
        .from("user_stats")
        .select("user_id, tiket")
        .gte("tiket", 10);
      return data?.map((u) => u.user_id) ?? [];
    }

    case "almost_entry": {
      // users where tiket % 10 >= 8 (8 or 9 tickets toward next entry)
      const { data } = await supabase
        .from("user_stats")
        .select("user_id, tiket")
        .gt("tiket", 0);
      return (
        data
          ?.filter((u) => u.tiket % 10 >= 8)
          .map((u) => u.user_id) ?? []
      );
    }

    case "pending_surveys": {
      // Users who have NOT completed a survey in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: completed } = await supabase
        .from("survey_rewards")
        .select("user_id")
        .eq("status", "completed")
        .gte("created_at", sevenDaysAgo.toISOString());
      const completedSet = new Set(completed?.map((u) => u.user_id) ?? []);
      const { data: allUsers } = await supabase
        .from("user_stats")
        .select("user_id");
      return (
        allUsers
          ?.map((u) => u.user_id)
          .filter((id) => !completedSet.has(id)) ?? []
      );
    }

    default:
      console.warn(`[resolveSegment] Unknown segment "${segment}", targeting all`);
      return null;
  }
}

/**
 * Fetch push subscriptions filtered by segment.
 * Returns an array of subscription objects.
 */
export async function fetchSubscriptionsForSegment(
  supabase: SupabaseClient,
  segment: string
): Promise<Array<{ id: string; endpoint: string; p256dh: string; auth: string; user_id: string }>> {
  const userIds = await resolveSegmentUserIds(supabase, segment);

  let query = supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_id");

  if (userIds !== null && userIds.length > 0) {
    query = query.in("user_id", userIds);
  } else if (userIds !== null && userIds.length === 0) {
    // segment resolved but no matching users → no subscriptions
    return [];
  }
  // userIds === null → all subscriptions

  const { data, error } = await query;
  if (error) {
    console.error("[resolveSegment] fetchSubscriptionsForSegment error:", error);
    return [];
  }
  return data ?? [];
}
