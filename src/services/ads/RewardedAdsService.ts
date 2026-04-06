import { supabase } from "@/lib/supabase";
import { IRewardedAdProvider } from "./IAdProvider";
import { AdRewardInfo, AdError } from "./types";
import { DemoAdProvider } from "./providers/DemoAdProvider";
import { AdMobRewardedProvider } from "./providers/AdMobRewardedProvider";

export class RewardedAdsService {
  private static instance: RewardedAdsService;
  private currentProvider: IRewardedAdProvider | null = null;
  private isInitializing: boolean = false;
  private currentAdViewId: string | null = null;
  private adStartedAt: number | null = null;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): RewardedAdsService {
    if (!RewardedAdsService.instance) {
      RewardedAdsService.instance = new RewardedAdsService();
    }
    return RewardedAdsService.instance;
  }

  private initialize() {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      // Platform Detection: Check for Capacitor or Android native bridge
      const isNative = (window as any).Capacitor?.isNative || (window as any).android !== undefined;
      const adMobUnitId = import.meta.env.VITE_ADMOB_REWARDED_AD_UNIT_ID_ANDROID;

      if (isNative && adMobUnitId) {
        console.log("[RewardedAdsService] Platform: Native. Selecting AdMobRewardedProvider.");
        this.currentProvider = new AdMobRewardedProvider();
      } else {
        console.log("[RewardedAdsService] Platform: Web/PWA. Selecting DemoAdProvider.");
        this.currentProvider = new DemoAdProvider();
      }

      // Preload immediately if provider is set
      this.preloadRewardedAd();
    } catch (err) {
      console.error("[RewardedAdsService] Initialization failed, falling back to Demo.", err);
      this.currentProvider = new DemoAdProvider();
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Set the active provider (e.g., based on platform/mediation success)
   */
  public setProvider(provider: IRewardedAdProvider) {
    this.currentProvider = provider;
  }

  /**
   * Preload an ad from the current provider
   */
  public async preloadRewardedAd(): Promise<void> {
    if (!this.currentProvider) return;
    await this.currentProvider.preload();
  }

  /**
   * Show the rewarded ad and handle the ticketing logic
   */
  public async showRewardedAd(
    onReward: (info: AdRewardInfo) => void,
    onClose: () => void,
    onError: (error: AdError) => void
  ): Promise<void> {
    if (!this.currentProvider) {
      onError({ code: 'NO_PROVIDER', message: 'No ad provider configured' });
      return;
    }

    if (!this.currentProvider.isReady()) {
      onError({ code: 'NOT_READY', message: 'Ad not yet preloaded' });
      return;
    }

    // Capture start time for duration tracking
    this.adStartedAt = Date.now();
    this.currentAdViewId = crypto.randomUUID(); // Mock ID for current view

    // Record start in DB
    console.log(`[RewardedAdsService] [rewardedAd] started (Log ID: ${this.currentAdViewId})`);

    // Wrap the provider's show call to handle our server-side validation
    await this.currentProvider.show(
      async (info) => {
        const duration = this.calculateDuration();
        console.log(`[RewardedAdsService] [rewardedAd] completed in ${duration}s. Granting reward...`);
        
        // 1. Server-side validation and grant
        const { data, error: rpcError } = await supabase.rpc('grant_ad_reward', { 
            p_user_id: (await supabase.auth.getUser()).data.user?.id, 
            p_ad_view_id: this.currentAdViewId 
        });

        if (rpcError) {
            console.error("[RewardedAdsService] Reward grant failed:", rpcError.message);
        } else {
            console.log("[RewardedAdsService] [rewardedAd] rewardGranted successfully.");
        }
        
        onReward(info);
        this.resetSession();
      },
      () => {
        console.log(`[RewardedAdsService] [rewardedAd] closed by user.`);
        onClose();
        this.resetSession();
      },
      (error) => {
        console.error(`[RewardedAdsService] [rewardedAd] failed: ${error.message}`);
        onError(error);
        this.resetSession();
      }
    );
  }

  private calculateDuration(): number {
    if (!this.adStartedAt) return 0;
    return Math.floor((Date.now() - this.adStartedAt) / 1000);
  }

  private resetSession() {
    this.adStartedAt = null;
    this.currentAdViewId = null;
  }

  /**
   * Check daily ad cap for the user
   */
  public async getDailyAdStats(userId: string) {
    const { data, error } = await supabase
      .from('ad_daily_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('day', new Date().toISOString().slice(0, 10))
      .maybeSingle();
      
    return { data, error };
  }
}

export const rewardedAds = RewardedAdsService.getInstance();
