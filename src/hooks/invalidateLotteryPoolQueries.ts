import type { QueryClient } from "@tanstack/react-query";
import { MY_LOTTERY_BALLOTS_QUERY_KEY } from "@/hooks/useMyLotteryBallots";

/** After any action that inserts into lottery_tickets (ads, receipts, shake, etc.) */
export function invalidateLotteryPoolQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: [...MY_LOTTERY_BALLOTS_QUERY_KEY] });
  void queryClient.invalidateQueries({ queryKey: ["weeklyDraw", "lotteryTicketsCount"] });
}
