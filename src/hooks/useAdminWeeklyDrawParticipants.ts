import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ParticipantStats {
  user_id: string;
  nickname: string;
  ticket_count: number;
  weekly_entries: number;
  approved_receipts: number;
  approved_deals: number;
  invited_friends: number;
}

export function useAdminWeeklyDrawParticipants() {
  return useQuery({
    queryKey: ["admin_weekly_draw_participants"],
    queryFn: async (): Promise<ParticipantStats[]> => {
      console.log("[AdminWeeklyDraw] start");
      
      const { data, error } = await supabase.rpc("get_admin_weekly_draw_participants");
      
      if (error) {
        console.error("[AdminWeeklyDraw] rpcError:", error);
        throw error;
      }
      
      console.log("[AdminWeeklyDraw] rawData", data);
      const participants = (data as ParticipantStats[]) ?? [];
      console.log("[AdminWeeklyDraw] parsedData", participants);
      
      return participants;
    },
    staleTime: 60000,
  });
}
