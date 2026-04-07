import { supabase } from "@/lib/supabase";
import { IRewardedAdProvider } from "./IAdProvider";
import { AdRewardInfo, AdError } from "./types";
import { DemoAdProvider } from "./providers/DemoAdProvider";
import { AdMobRewardedProvider } from "./providers/AdMobRewardedProvider";

import { Capacitor } from "@capacitor/core";

export class RewardedAdsService {
  private static instance: RewardedAdsService;
  private currentProvider: IRewardedAdProvider | null = null;
  private isInitializing: boolean = false;
  private currentAdViewId: string | null = null;
  private adStartedAt: number | null = null;
  private currentUserId: string | null = null;
  private _isPlaying: boolean = false;

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
      // Platform Detection: Use Capacitor for robust native vs web check
      const isNative = Capacitor.isNativePlatform();
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

    if (this._isPlaying) {
      console.warn("[RewardedAdsService] Ad is already playing.");
      return;
    }

    if (!this.currentProvider.isReady()) {
      onError({ code: 'NOT_READY', message: 'Ad not yet preloaded' });
      return;
    }

    this._isPlaying = true;
    // Capture current user
    const { data: { user } } = await supabase.auth.getUser();
    this.currentUserId = user?.id || null;

    if (!this.currentUserId) {
      onError({ code: 'AUTH_REQUIRED', message: 'User must be logged in' });
      return;
    }

    // Capture start time for duration tracking
    this.adStartedAt = Date.now();
    
    // 1. Log ad start in DB
    await this.logAdStart();

    // Wrap the provider's show call to handle our server-side validation
    await this.currentProvider.show(
      async (info) => {
        const duration = this.calculateDuration();
        
        // 2. Log completion in DB
        await this.logAdComplete(duration, info.metadata);
        
        // 3. Grant actual reward via RPC
        console.log(`[RewardedAdsService] [rewardedAd] completed in ${duration}s. Granting reward...`);
        const result = await supabase.rpc('grant_ad_reward', { 
            p_user_id: this.currentUserId, 
            p_ad_view_id: this.currentAdViewId 
        });

        console.log('[grantReward] result', result);

        if (result.error) {
            console.error('[grantReward] error', result.error);
        } else {
            console.log("[RewardedAdsService] [rewardedAd] rewardGranted successfully.");
            console.log("[RewardedAdsService] [dailyStats] updated");
        }
        
        onReward(info);
        this.resetSession();
      },
      async () => {
        await this.logAdFailure('user_closed_early');
        console.log(`[RewardedAdsService] [rewardedAd] closed by user.`);
        onClose();
        this.resetSession();
      },
      async (error) => {
        await this.logAdFailure(error.code || 'error', error.message);
        console.error(`[RewardedAdsService] [rewardedAd] failed: ${error.message}`);
        onError(error);
        this.resetSession();
      }
    );
  }

  private async logAdStart() {
    if (!this.currentUserId || !this.currentProvider) return;

    const metadata = {
        platform: this.getPlatformDetails().isNative ? 'native' : 'web',
        provider: this.currentProvider.name,
        stepCount: 3, // Default for demo
        timestamp: new Date().toISOString()
    };

    console.log('[adLog] inserting start row');
    const result = await supabase
      .from('ad_views')
      .insert({
        user_id: this.currentUserId,
        provider_name: this.currentProvider.name,
        status: 'started',
        reward_granted: false,
        ad_started_at: new Date().toISOString(),
        metadata: metadata
      })
      .select('id')
      .single();

    console.log('[adLog] insert result', result);

    if (result.error) {
        console.error('[adLog] insert error', result.error);
    } else {
        this.currentAdViewId = result.data.id;
        console.log(`[RewardedAdsService] [adLog] inserted ID: ${this.currentAdViewId}`);
        
        // Increment daily view_count (Start)
        const statsRow = await supabase.rpc('increment_ad_view_count', { p_user_id: this.currentUserId });
        console.log('[dailyStats] increment result', statsRow);
        if (statsRow.error) {
            console.error('[dailyStats] error', statsRow.error);
        }
    }
}

  private async logAdComplete(duration: number, metadata?: any) {
    if (!this.currentAdViewId) return;

    console.log('[adLog] updating completion row');
    const result = await supabase
      .from('ad_views')
      .update({
        status: 'completed',
        ad_completed_at: new Date().toISOString(),
        completion_duration_seconds: duration,
        revenue_estimate: 0.01,
        metadata: {
            ...metadata,
            completedAt: new Date().toISOString()
        }
      })
      .eq('id', this.currentAdViewId);

    console.log('[adLog] update result', result);

    if (result.error) {
        console.error('[adLog] update error', result.error);
    } else {
        console.log("[RewardedAdsService] [adLog] completed");
    }
  }

  private async logAdFailure(reason: string, message?: string) {
    if (!this.currentAdViewId) return;

    const { error } = await supabase
      .from('ad_views')
      .update({
        status: 'failed',
        error_message: message || reason,
        metadata: {
            closeReason: reason,
            failedAt: new Date().toISOString()
        }
      })
      .eq('id', this.currentAdViewId);

    if (error) {
        console.error("[RewardedAdsService] logAdFailure error:", error.message);
    } else {
        console.log("[RewardedAdsService] [adLog] failed");
    }
  }

  private calculateDuration(): number {
    if (!this.adStartedAt) return 0;
    return Math.floor((Date.now() - this.adStartedAt) / 1000);
  }

  private resetSession() {
    this.adStartedAt = null;
    this.currentAdViewId = null;
    this._isPlaying = false;
  }

  public isReady(): boolean {
    return this.currentProvider?.isReady() || false;
  }

  public isPlaying(): boolean {
    return this._isPlaying;
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

  public getProviderName(): string {
    return this.currentProvider?.name || 'none';
  }

  public getPlatformDetails() {
    return {
      isNative: (window as any).Capacitor?.isNative || (window as any).android !== undefined,
      hasAdMobEnv: !!import.meta.env.VITE_ADMOB_REWARDED_AD_UNIT_ID_ANDROID && !!import.meta.env.VITE_ADMOB_APP_ID_ANDROID,
      provider: this.getProviderName()
    };
  }
}

export const rewardedAds = RewardedAdsService.getInstance();
