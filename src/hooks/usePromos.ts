import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { haversineDistance } from "@/hooks/useUserLocation";

export type PromoStatus = "pending" | "verified" | "expired";
export type VoteType = "positive" | "negative";

export interface PromoRow {
  id: number;
  user_id: string;
  photo_url: string;
  product_name: string;
  discount: number;
  store_name: string;
  latitude: number;
  longitude: number;
  created_at: string;
  status: PromoStatus;
  positive_votes?: number;
  negative_votes?: number;
  user_vote?: VoteType | null;
  author_nickname?: string | null;
  author_level?: number;
  is_expired_by_time?: boolean;
}

const PROMO_EXPIRY_HOURS = 24;

export const PROMOS_QUERY_KEY = ["promos"];
const MAX_PROMOS_PER_DAY = 3;
const STORE_COOLDOWN_MINUTES = 30;

export async function fetchPromosNearby(
  userLat: number,
  userLng: number,
  userId?: string | null,
  radiusKm = 10
): Promise<PromoRow[]> {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((userLat * Math.PI) / 180));

  const { data: promosData, error } = await supabase
    .from("promos")
    .select("*")
    .in("status", ["pending", "verified", "expired"])
    .gte("latitude", userLat - latDelta)
    .lte("latitude", userLat + latDelta)
    .gte("longitude", userLng - lngDelta)
    .lte("longitude", userLng + lngDelta)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch promos", error);
    throw error;
  }

  const promos = (promosData ?? []) as PromoRow[];
  if (promos.length === 0) return [];

  const promoIds = promos.map((p) => p.id);
  const { data: votesData } = await supabase
    .from("promo_votes")
    .select("promo_id, user_id, vote_type")
    .in("promo_id", promoIds);

  const votes = (votesData ?? []) as { promo_id: number; user_id: string; vote_type: VoteType }[];
  const votesByPromo = votes.reduce<Record<number, { positive: number; negative: number; userVote: VoteType | null }>>(
    (acc, v) => {
      if (!acc[v.promo_id]) acc[v.promo_id] = { positive: 0, negative: 0, userVote: null };
      if (v.vote_type === "positive") acc[v.promo_id].positive++;
      else acc[v.promo_id].negative++;
      if (v.user_id === userId) acc[v.promo_id].userVote = v.vote_type;
      return acc;
    },
    {}
  );

  const authorIds = [...new Set(promos.map((p) => p.user_id))];
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, nickname")
    .in("id", authorIds);
  const { data: statsData } = await supabase
    .from("user_stats")
    .select("user_id, level")
    .in("user_id", authorIds);

  const profiles = (profilesData ?? []) as { id: string; nickname: string | null }[];
  const stats = (statsData ?? []) as { user_id: string; level: number }[];
  const profileMap = Object.fromEntries(profiles.map((pr) => [pr.id, pr.nickname]));
  const levelMap = Object.fromEntries(stats.map((s) => [s.user_id, s.level ?? 1]));

  const now = Date.now();
  const expiryMs = PROMO_EXPIRY_HOURS * 60 * 60 * 1000;

  return promos.map((p) => {
    const createdMs = new Date(p.created_at).getTime();
    const isExpiredByTime = now - createdMs > expiryMs;
    return {
      ...p,
      positive_votes: votesByPromo[p.id]?.positive ?? 0,
      negative_votes: votesByPromo[p.id]?.negative ?? 0,
      user_vote: votesByPromo[p.id]?.userVote ?? null,
      author_nickname: profileMap[p.user_id] ?? null,
      author_level: levelMap[p.user_id] ?? 1,
      is_expired_by_time: isExpiredByTime,
    };
  });
}

export function usePromosNearby(
  userLat: number | null,
  userLng: number | null,
  userId?: string | null,
  radiusKm = 10
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...PROMOS_QUERY_KEY, "nearby", userLat, userLng, userId, radiusKm],
    queryFn: () => fetchPromosNearby(userLat!, userLng!, userId, radiusKm),
    enabled: userLat != null && userLng != null,
  });

  useEffect(() => {
    const channel = supabase
      .channel("realtime:promos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promos" },
        () => {
          queryClient.invalidateQueries({ queryKey: PROMOS_QUERY_KEY });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promo_votes" },
        () => {
          queryClient.invalidateQueries({ queryKey: PROMOS_QUERY_KEY });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Enrich with user vote and distance, sort by created_at DESC
  const promosWithDistance = (query.data ?? []).map((p) => {
    const dist = userLat != null && userLng != null
      ? haversineDistance(userLat, userLng, p.latitude, p.longitude)
      : 0;
    return { ...p, distance_km: dist };
  }).filter((p) => p.distance_km <= radiusKm).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return {
    ...query,
    data: promosWithDistance,
  };
}

export async function fetchUserPromoCountToday(userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("promos")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lte("created_at", `${today}T23:59:59.999Z`);

  if (error) throw error;
  return count ?? 0;
}

export async function fetchLastPromoAtStore(
  userId: string,
  storeName: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("promos")
    .select("created_at")
    .eq("user_id", userId)
    .ilike("store_name", storeName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.created_at ?? null;
}

export function useCreatePromo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      photoUrl: string;
      productName: string;
      discount: number;
      storeName: string;
      latitude: number;
      longitude: number;
    }) => {
      const { error } = await supabase.from("promos").insert({
        user_id: params.userId,
        photo_url: params.photoUrl,
        product_name: params.productName,
        discount: params.discount,
        store_name: params.storeName,
        latitude: params.latitude,
        longitude: params.longitude,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMOS_QUERY_KEY });
    },
  });
}

export function useVotePromo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      promoId: number;
      userId: string;
      voteType: VoteType;
    }) => {
      const { error } = await supabase.from("promo_votes").upsert(
        {
          promo_id: params.promoId,
          user_id: params.userId,
          vote_type: params.voteType,
        },
        { onConflict: "promo_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROMOS_QUERY_KEY });
    },
  });
}

export {
  MAX_PROMOS_PER_DAY,
  STORE_COOLDOWN_MINUTES,
};
