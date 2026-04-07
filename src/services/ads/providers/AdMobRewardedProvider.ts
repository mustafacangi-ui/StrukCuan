import { IRewardedAdProvider } from "../IAdProvider";
import { AdProviderName, AdRewardInfo, AdError, AdEventMetadata } from "../types";
import { Capacitor } from "@capacitor/core";
import { adMobService } from "../AdMobService";

/**
 * AdMobRewardedProvider: 
 * Implementation for Native Android using the centralized AdMobService.
 */
export class AdMobRewardedProvider implements IRewardedAdProvider {
  readonly name: AdProviderName = "admob";
  private isLoaded: boolean = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (!Capacitor.isNativePlatform()) return;
    await adMobService.initialize();
  }

  public isReady(): boolean {
    return this.isLoaded;
  }

  public async preload(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log("[Ads/AdMob] Skipped preload (Not Native)");
      return;
    }

    try {
      console.log(`[Ads/AdMob] Preloading AdMob rewarded ad...`);
      await adMobService.prepareRewarded();
      this.isLoaded = true;
      console.log("[Ads/AdMob] Native ad loaded and ready.");
    } catch (err: any) {
      console.error("[Ads/AdMob] Preload failed:", err.message);
      this.isLoaded = false;
    }
  }

  public async show(
    onReward: (info: AdRewardInfo) => void,
    onClose: () => void,
    onError: (error: AdError) => void
  ): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      onError({ code: "NOT_NATIVE", message: "AdMob requires native platform" });
      return;
    }

    if (!this.isLoaded) {
      onError({ code: "NOT_LOADED", message: "AdMob ad not preloaded" });
      return;
    }

    try {
      console.log("[Ads/AdMob] showing native rewarded video");
      
      const reward = await adMobService.showRewarded();
      this.isLoaded = false; // Reset after show
      
      if (reward) {
        onReward({ 
          ticketsAdded: (reward as any).amount || 1, 
          dailyTotal: 0,
          metadata: {
              stepCount: 1,
              completedSteps: 1,
              closeReason: 'completed',
              provider_name: 'admob',
              native_reward_type: (reward as any).type
          } as AdEventMetadata
        });
        onClose();
      } else {
        // If reward is null, it might have been closed without reward or failed
        // Usually, the service logs errors. We'll treat this as onClose for the provider flow.
        onClose();
      }
    } catch (err: any) {
      console.error("[Ads/AdMob] display failed", err);
      onError({ code: "ADMOB_SHOW_FAIL", message: err.message });
      onClose(); 
    }
  }
}
