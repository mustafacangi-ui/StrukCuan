import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface NotificationRow {
  id: number;
  user_id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export const NOTIFICATIONS_QUERY_KEY = ["notifications"];

async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch notifications", error);
    throw error;
  }

  return (data as NotificationRow[]) ?? [];
}

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, userId],
    queryFn: () => fetchNotifications(userId as string),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("realtime:notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          const newRow = payload.new as NotificationRow | null;
          const oldRow = payload.old as NotificationRow | null;

          if (newRow?.user_id === userId || oldRow?.user_id === userId) {
            queryClient.invalidateQueries({
              queryKey: [...NOTIFICATIONS_QUERY_KEY, userId],
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return query;
}

export function useMarkNotificationsRead(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) {
        console.error("Failed to mark notifications as read", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

