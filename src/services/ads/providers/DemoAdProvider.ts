import { IRewardedAdProvider } from "../IAdProvider";
import { AdProviderName, AdRewardInfo, AdError } from "../types";
import { grantTickets } from "@/lib/grantTickets";
import { supabase } from "@/lib/supabase";

/**
 * DemoAdProvider: The current web/PWA implementation for rewarded ads.
 * Mimics a real SDK behavior with timeouts and manual grants.
 */
export class DemoAdProvider implements IRewardedAdProvider {
  readonly name: AdProviderName = "demo";
  private isAdReady: boolean = false;

  public isReady(): boolean {
    return this.isAdReady;
  }

  public async preload(): Promise<void> {
    if (this.isAdReady) return;
    
    console.log('[rewardedAd] preload started');
    
    // Fail-safe: Mark as ready after 3 seconds even if loading hangs
    const fallbackTimer = setTimeout(() => {
        if (!this.isAdReady) {
            this.isAdReady = true;
            console.log('[rewardedAd] preload forced (fallback timeout)');
            console.log('[rewardedAd] ready=true');
        }
    }, 3000);

    // Simulate loading
    await new Promise((res) => setTimeout(res, 800));
    
    clearTimeout(fallbackTimer);
    this.isAdReady = true;
    console.log('[rewardedAd] preload completed');
    console.log('[rewardedAd] ready=true');
  }

  public async show(
    onReward: (info: AdRewardInfo) => void,
    onClose: () => void,
    onError: (error: AdError) => void
  ): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      onError({ code: "AUTH_REQUIRED", message: "User session not found" });
      return;
    }

    try {
      console.log('[rewardedAd] started');
      const stepCount = 3;
      let completedSteps = 0;

      for (let i = 1; i <= stepCount; i++) {
        // Simulate ad watching duration per step
        await new Promise((res) => setTimeout(res, 2000));
        completedSteps = i;
        console.log(`[rewardedAd] step${i} complete`);
      }

      this.isAdReady = false; // Reset after show
      
      // Grant reward (using existing helper for now)
      await grantTickets(userId, 1);
      
      console.log('[rewardedAd] rewardGranted');
      onReward({ 
        ticketsAdded: 1, 
        dailyTotal: 0,
        metadata: {
            stepCount: stepCount,
            completedSteps: completedSteps,
            closeReason: 'completed'
        }
      }); 
      onClose();
    } catch (err: any) {
      console.log('[rewardedAd] failed');
      onError({ code: "DEMO_ERR", message: err.message });
    }
  }
}
