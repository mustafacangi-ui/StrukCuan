import { Capacitor } from "@capacitor/core";

/**
 * AdMob Official Test IDs
 * DO NOT use these in production. Replace with real Unit IDs from AdMob dashboard.
 */
export const ADMOB_TEST_IDS = {
  ANDROID: {
    APP_ID: "ca-app-pub-3940256099942544~3347511713",
    BANNER: "ca-app-pub-3940256099942544/6300978111",
    INTERSTITIAL: "ca-app-pub-3940256099942544/1033173712",
    REWARDED: "ca-app-pub-3940256099942544/5224354917",
  }
};

const ADMOB_PKG = "@capacitor-community/admob";

export class AdMobService {
  private static instance: AdMobService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AdMobService {
    if (!AdMobService.instance) {
      AdMobService.instance = new AdMobService();
    }
    return AdMobService.instance;
  }

  /**
   * Initialize AdMob SDK
   */
  public async initialize() {
    if (!Capacitor.isNativePlatform()) {
      console.log("[AdMob] initialize: Skipped (Not Native)");
      return;
    }
    if (this.isInitialized) return;

    try {
      const { AdMob } = await import(/* @vite-ignore */ ADMOB_PKG);
      await AdMob.initialize({
        initializeForTesting: true,
      });
      this.isInitialized = true;
      console.log("[AdMob] initialize");
    } catch (err: any) {
      console.error("[AdMob] error: initialize failed", err);
    }
  }

  /**
   * SHOW BANNER
   */
  public async showBanner() {
    if (!Capacitor.isNativePlatform()) return;
    await this.initialize();

    try {
      const { AdMob, BannerAdPosition, BannerAdSize } = await import(/* @vite-ignore */ ADMOB_PKG);
      
      const options = {
        adId: ADMOB_TEST_IDS.ANDROID.BANNER,
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
      };

      await AdMob.showBanner(options);
      console.log("[AdMob] banner shown");
    } catch (err: any) {
      console.error("[AdMob] error: showBanner failed", err);
    }
  }

  /**
   * HIDE BANNER
   */
  public async hideBanner() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { AdMob } = await import(/* @vite-ignore */ ADMOB_PKG);
      await AdMob.removeBanner();
      console.log("[AdMob] banner removed");
    } catch (err: any) {
      console.error("[AdMob] error: hideBanner failed", err);
    }
  }

  /**
   * PREPARE INTERSTITIAL
   */
  public async prepareInterstitial() {
    if (!Capacitor.isNativePlatform()) return;
    await this.initialize();

    try {
      const { AdMob } = await import(/* @vite-ignore */ ADMOB_PKG);
      await AdMob.prepareInterstitial({
        adId: ADMOB_TEST_IDS.ANDROID.INTERSTITIAL,
      });
      console.log("[AdMob] interstitial prepared");
    } catch (err: any) {
      console.error("[AdMob] error: prepareInterstitial failed", err);
    }
  }

  /**
   * SHOW INTERSTITIAL
   */
  public async showInterstitial() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { AdMob } = await import(/* @vite-ignore */ ADMOB_PKG);
      await AdMob.showInterstitial();
      console.log("[AdMob] interstitial shown");
    } catch (err: any) {
      console.error("[AdMob] error: showInterstitial failed", err);
    }
  }

  /**
   * PREPARE REWARDED VIDEO
   */
  public async prepareRewarded() {
    if (!Capacitor.isNativePlatform()) return;
    await this.initialize();

    try {
      const { AdMob } = await import(/* @vite-ignore */ ADMOB_PKG);
      await AdMob.prepareRewardVideoAd({
        adId: ADMOB_TEST_IDS.ANDROID.REWARDED,
      });
      console.log("[AdMob] rewarded prepared");
    } catch (err: any) {
      console.error("[AdMob] error: prepareRewarded failed", err);
    }
  }

  /**
   * SHOW REWARDED VIDEO
   * @returns The reward object if successful, null otherwise
   */
  public async showRewarded() {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      const { AdMob } = await import(/* @vite-ignore */ ADMOB_PKG);
      const reward = await AdMob.showRewardVideoAd();
      console.log("[AdMob] rewarded shown");
      
      if (reward) {
        console.log("[AdMob] reward earned", reward);
        return reward;
      }
      return null;
    } catch (err: any) {
      console.error("[AdMob] error: showRewarded failed", err);
      // Detailed error log
      console.log("[AdMob] error"); 
      return null;
    }
  }
}

export const adMobService = AdMobService.getInstance();
