import { IRewardedAdProvider } from "../IAdProvider";
import { AdProviderName, AdRewardInfo, AdError, AdEventMetadata } from "../types";
import { AdMob, RewardAdOptions, AdMobRewardItem } from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";

/**
 * AdMobRewardedProvider: 
 * Implementation for Native Android using Capacitor Community AdMob SDK.
 */
export class AdMobRewardedProvider implements IRewardedAdProvider {
  readonly name: AdProviderName = "admob";
  private isLoaded: boolean = false;
  private adUnitId: string = import.meta.env.VITE_ADMOB_REWARDED_AD_UNIT_ID_ANDROID || "ca-app-pub-3940256099942544/5224354917"; // Default to test unit ID

  constructor() {
    this.init();
  }

  private async init() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await AdMob.initialize({
        requestTrackingAuthorization: true,
        testingDevices: ["2077ef9a63d2b398840261c8221a0c9b"],
        initializeForTesting: true,
      });
      console.log("[Ads/AdMob] Native SDK Initialized");
    } catch (err) {
      console.warn("[Ads/AdMob] Initialisation failed:", err);
    }
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
      console.log(`[Ads/AdMob] Preloading ad unit: ${this.adUnitId}...`);
      
      const options: RewardAdOptions = {
        adId: this.adUnitId,
      };

      await AdMob.prepareRewardVideoAd(options);
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
      console.log("[Ads/AdMob] [rewardedAd] showing native video");
      
      const reward: AdMobRewardItem = await AdMob.showRewardVideoAd();
      
      this.isLoaded = false; // Reset after show
      
      if (reward) {
        console.log("[Ads/AdMob] [rewardedAd] rewardGranted", reward);
        onReward({ 
          ticketsAdded: reward.amount || 1, 
          dailyTotal: 0,
          metadata: {
              stepCount: 1,
              completedSteps: 1,
              closeReason: 'completed',
              provider_name: 'admob',
              native_reward_type: reward.type
          } as AdEventMetadata
        });
      }
      
      onClose();
    } catch (err: any) {
      console.error("[Ads/AdMob] [rewardedAd] failed", err);
      // Fail silently if user closed it early - check library behavior
      onError({ code: "ADMOB_SHOW_FAIL", message: err.message });
      onClose(); 
    }
  }
}
