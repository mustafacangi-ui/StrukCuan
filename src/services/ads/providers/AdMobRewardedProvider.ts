import { IRewardedAdProvider } from "../IAdProvider";
import { AdProviderName, AdRewardInfo, AdError, AdEventMetadata } from "../types";

/**
 * AdMobRewardedProvider: 
 * Future implementation for Native Android/iOS using Capacitor or React Native SDKs.
 * 
 * App ID: ca-app-pub-1526437909347510~8582512886
 * Rewarded Unit ID: ca-app-pub-1526437909347510/8390941190
 */
export class AdMobRewardedProvider implements IRewardedAdProvider {
  readonly name: AdProviderName = "admob";
  private isLoaded: boolean = false;
  private adUnitId: string = import.meta.env.VITE_ADMOB_REWARDED_AD_UNIT_ID_ANDROID || "";

  public isReady(): boolean {
    return this.isLoaded;
  }

  public async preload(): Promise<void> {
    if (!this.adUnitId) {
      console.warn("[Ads/AdMob] Missing AdMob Unit ID. Check environment variables.");
      return;
    }

    console.log(`[Ads/AdMob] Preloading ad unit: ${this.adUnitId}...`);
    
    // TODO: Integration with real AdMob SDK happens here.
    // Example (Capacitor):
    // await AdMob.prepareRewardVideoAd({ adId: this.adUnitId });
    
    // For now, simulate loading
    await new Promise((res) => setTimeout(res, 800));
    this.isLoaded = true;
    console.log("[Ads/AdMob] Ad loaded and ready for playback.");
  }

  public async show(
    onReward: (info: AdRewardInfo) => void,
    onClose: () => void,
    onError: (error: AdError) => void
  ): Promise<void> {
    if (!this.isLoaded) {
      onError({ code: "NOT_LOADED", message: "AdMob ad not preloaded" });
      return;
    }

    try {
      console.log("[Ads/AdMob] [rewardedAd] started");
      
      // TODO: Implementation for Native SDK show()
      // Example (Capacitor):
      // const reward = await AdMob.showRewardVideoAd();
      
      // Simulation for future native behavior
      console.log("[Ads/AdMob] [rewardedAd] step1 complete");
      await new Promise((res) => setTimeout(res, 3000)); // Simulating video playback
      
      console.log("[Ads/AdMob] [rewardedAd] step2 complete");
      console.log("[Ads/AdMob] [rewardedAd] step3 complete");
      
      this.isLoaded = false; // Reset after show
      
      console.log("[Ads/AdMob] [rewardedAd] rewardGranted");
      
      onReward({ 
        ticketsAdded: 1, 
        dailyTotal: 0,
        metadata: {
            stepCount: 3,
            completedSteps: 3,
            closeReason: 'completed',
            provider_name: 'admob'
        } as AdEventMetadata
      });
      
      onClose();
    } catch (err: any) {
      console.error("[Ads/AdMob] [rewardedAd] failed", err);
      onError({ code: "ADMOB_SHOW_FAIL", message: err.message });
    }
  }
}
