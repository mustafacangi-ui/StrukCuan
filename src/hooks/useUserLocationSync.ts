import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Syncs user location to user_locations table for 5km promo notifications.
 * Call when user is on Promo page and location is available.
 */
export function useUserLocationSync(
  userId: string | undefined,
  lat: number | null,
  lng: number | null
) {
  useEffect(() => {
    if (!userId || lat == null || lng == null) return;

    supabase
      .from("user_locations")
      .upsert(
        {
          user_id: userId,
          latitude: lat,
          longitude: lng,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .then(({ error }) => {
        if (error) console.warn("Failed to sync user location:", error);
      });
  }, [userId, lat, lng]);
}
