import { Capacitor } from "@capacitor/core";

/**
 * AdMob Official Test IDs
 */
export const ADMOB_TEST_IDS = {
  ANDROID: {
    APP_ID: "ca-app-pub-3940256099942544~3347511713",
    BANNER: "ca-app-pub-3940256099942544/6300978111",
    INTERSTITIAL: "ca-app-pub-3940256099942544/1033173712",
    REWARDED: "ca-app-pub-3940256099942544/5224354917",
  }
};

/**
 * AdMob Production IDs
 */
export const ADMOB_PROD_IDS = {
  ANDROID: {
    APP_ID: "ca-app-pub-1526437909347510~8582512886",
    // Keep Banners and Interstitial on Test IDs for now as per instructions
    BANNER: ADMOB_TEST_IDS.ANDROID.BANNER,
    INTERSTITIAL: ADMOB_TEST_IDS.ANDROID.INTERSTITIAL,
    REWARDED: "ca-app-pub-1526437909347510/8390941190",
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
   * Helper to get correct Ad Unit ID based on environment
   */
  private getUnitId(type: 'BANNER' | 'INTERSTITIAL' | 'REWARDED'): string {
    const isDev = import.meta.env.DEV;
    const ids = isDev ? ADMOB_TEST_IDS.ANDROID : ADMOB_PROD_IDS.ANDROID;
    return ids[type];
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
      const isDev = import.meta.env.DEV;
      
      await AdMob.initialize({
        initializeForTesting: isDev,
      });
      this.isInitialized = true;
      console.log(`[AdMob] initialize (mode: ${isDev ? 'DEBUG/TEST' : 'PRODUCTION'})`);
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
        adId: this.getUnitId('BANNER'),
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
        adId: this.getUnitId('INTERSTITIAL'),
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
        adId: this.getUnitId('REWARDED'),
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
