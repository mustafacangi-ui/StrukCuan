/**
 * Rewarded Ads Monetization Types
 */

export type AdProviderName = 'applovin' | 'admob' | 'unity' | 'demo' | 'meta' | 'pangle' | 'mintegral';

export type AdStatus = 'started' | 'completed' | 'failed' | 'skipped';

export interface AdRewardInfo {
  ticketsAdded: number;
  dailyTotal: number;
  metadata?: AdEventMetadata;
}

export interface AdError {
  code: string;
  message: string;
}

export type CloseReason = 'completed' | 'user_closed_early' | 'failed' | 'skipped' | 'none';

export interface AdEventMetadata {
  stepCount: number;
  completedSteps: number;
  closeReason: CloseReason;
  adUnitId?: string;
  revenueEst?: number;
  currency?: string;
  [key: string]: any;
}
