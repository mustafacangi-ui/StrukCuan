import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { queryClient } from "@/lib/queryClient";
import { TICKET_QUERY_KEYS } from "@/lib/grantTickets";

export class DailyRewardService {
  private static instance: DailyRewardService;
  private isProcessing: boolean = false;

  private constructor() {}

  public static getInstance(): DailyRewardService {
    if (!DailyRewardService.instance) {
      DailyRewardService.instance = new DailyRewardService();
    }
    return DailyRewardService.instance;
  }

  /**
   * Automatically checks eligibility and claims the daily login reward (+1 ticket).
   * Should be triggered once per session/mount.
   */
  public async checkAndClaimDailyReward(userId: string | undefined): Promise<{ success: boolean; already_claimed: boolean; granted_ticket_count: number } | null> {
    if (!userId || this.isProcessing) return null;

    try {
      this.isProcessing = true;
      console.log('[dailyGift] checking eligibility');

      const { data, error } = await supabase.rpc('claim_daily_welcome_reward', {
          p_user_id: userId
      });

      console.log('[dailyGift] rpc response', data);

      if (error) {
        console.error('[dailyGift] error', error);
        return null;
      }

      const res = data as { success: boolean; already_claimed: boolean; granted_ticket_count: number };

      if (res.success && res.granted_ticket_count > 0) {
        console.log('[dailyGift] reward granted');
        toast.success('Selamat datang kembali 🎁 Hadiah harian kamu sudah masuk ke akun hari ini.');
        
        // Invalidate ticket-related queries to refresh UI balance
        for (const key of TICKET_QUERY_KEYS) {
            queryClient.invalidateQueries({ queryKey: key });
        }
      } else if (res.already_claimed) {
        console.log('[dailyGift] already claimed today');
      }

      return res;
    } catch (err) {
      console.error('[dailyGift] error', err);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if the user has already claimed the reward for today (Jakarta time).
   * For UI display purposes.
   */
  public async isAlreadyClaimedToday(userId: string | undefined): Promise<boolean> {
    if (!userId) return true;

    try {
      const jakartaToday = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      const { data, error } = await supabase
        .from('daily_login_rewards')
        .select('user_id')
        .eq('user_id', userId)
        .eq('claim_date', jakartaToday)
        .maybeSingle();

      if (error) {
        console.error('[dailyGift] error fetching status', error);
        return true; // Default to true to avoid double-claim attempt UI
      }

      return !!data;
    } catch (err) {
      console.error('[dailyGift] status check error', err);
      return true;
    }
  }
}

export const dailyRewardService = DailyRewardService.getInstance();
