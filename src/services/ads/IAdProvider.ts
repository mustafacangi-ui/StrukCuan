import { AdProviderName, AdRewardInfo, AdError } from "./types";

export interface IRewardedAdProvider {
  /**
   * The unique name of the ad provider
   */
  readonly name: AdProviderName;

  /**
   * Check if the ad is preloaded and ready to show
   */
  isReady(): boolean;

  /**
   * Preload the ad content (warm-up)
   */
  preload(): Promise<void>;

  /**
   * Show the rewarded ad to the user
   * @param onReward callback when the user has fully watched the ad
   * @param onClose callback when the user closes the ad (whether rewarded or not)
   * @param onError callback if the ad fails to load or show
   */
  show(
    onReward: (info: AdRewardInfo) => void,
    onClose: () => void,
    onError: (error: AdError) => void
  ): Promise<void>;
}
