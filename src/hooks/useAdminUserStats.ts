import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface AdminDashboardStats {
  totalUsers: number;
  onlineNow: number;
  activeToday: number;
  activeThisWeek: number;
  newToday: number;
  newThisWeek: number;
  chartNew: { date: string; count: number }[];
  chartActive: { date: string; count: number }[];
}

export function useAdminUserStats() {
  return useQuery({
    queryKey: ["admin_user_stats"],
    queryFn: async (): Promise<AdminDashboardStats> => {
      const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
      
      if (error) {
        console.error("[useAdminUserStats] RPC error:", error);
        throw error;
      }
      
      return data as AdminDashboardStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  });
}
