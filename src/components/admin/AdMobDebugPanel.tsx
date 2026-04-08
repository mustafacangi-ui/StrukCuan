import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adMobService } from '@/services/ads/AdMobService';
import { Bug, Play, Eye, EyeOff, Layout, Video } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AdMobDebugPanel:
 * A temporary panel for testing real AdMob impressions using Google Test IDs.
 * Only visible in development mode.
 */
export const AdMobDebugPanel: React.FC = () => {
  const [isBannerVisible, setIsBannerVisible] = useState(false);

  // Security: Never show this in production builds
  if (import.meta.env.PROD) return null;

  const handleShowBanner = async () => {
    try {
      await adMobService.showBanner();
      setIsBannerVisible(true);
      toast.success("AdMob: Banner requested");
    } catch (e) {
      toast.error("AdMob Error: Show Banner failed");
    }
  };

  const handleHideBanner = async () => {
    try {
      await adMobService.hideBanner();
      setIsBannerVisible(false);
      toast.info("AdMob: Banner hidden");
    } catch (e) {
      toast.error("AdMob Error: Hide Banner failed");
    }
  };

  const handlePrepareInterstitial = async () => {
    await adMobService.prepareInterstitial();
    toast.info("AdMob: Preparing Interstitial...");
  };

  const handleShowInterstitial = async () => {
    await adMobService.showInterstitial();
  };

  const handlePrepareRewarded = async () => {
    await adMobService.prepareRewarded();
    toast.info("AdMob: Preparing Rewarded...");
  };

  const handleShowRewarded = async () => {
    const reward = await adMobService.showRewarded();
    if (reward) {
      toast.success(`AdMob Reward Earned: ${reward.amount} tickets!`);
    } else {
      toast.error("AdMob: No reward returned (or ad closed)");
    }
  };

  return (
    <Card className="m-4 border-dashed border-primary/50 bg-primary/5 shadow-2xl backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
          <Bug className="h-4 w-4 animate-pulse" />
          AdMob Debug Panel (TEST IDs)
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase text-muted-foreground/70">Banner Ads</p>
          <div className="flex flex-col gap-2">
            <Button 
              size="sm" 
              variant={isBannerVisible ? "destructive" : "default"} 
              onClick={isBannerVisible ? handleHideBanner : handleShowBanner} 
              className="h-9 text-[10px] shadow-sm active:scale-95 transition-transform"
            >
              {isBannerVisible ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
              {isBannerVisible ? "HIDE BANNER" : "SHOW BANNER"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase text-muted-foreground/70">Interstitial</p>
          <div className="flex flex-col gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handlePrepareInterstitial} 
              className="h-9 text-[10px] border-primary/20 hover:bg-primary/5 shadow-sm active:scale-95 transition-transform"
            >
              <Layout className="mr-1.5 h-3.5 w-3.5" />
              PREPARE
            </Button>
            <Button 
              size="sm" 
              onClick={handleShowInterstitial} 
              className="h-9 text-[10px] shadow-sm active:scale-95 transition-transform"
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              SHOW
            </Button>
          </div>
        </div>

        <div className="col-span-2 space-y-2 pt-3 border-t border-primary/10">
          <p className="text-[10px] font-bold uppercase text-muted-foreground/70">Rewarded Video (Tickets)</p>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handlePrepareRewarded} 
              className="flex-1 h-10 text-[10px] border-primary/20 hover:bg-primary/5 shadow-sm active:scale-95 transition-transform"
            >
              <Video className="mr-1.5 h-4 w-4" />
              PREPARE
            </Button>
            <Button 
              size="sm" 
              onClick={handleShowRewarded} 
              className="flex-1 h-10 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95 transition-transform"
            >
              <Play className="mr-1.5 h-4 w-4" />
              SHOW REWARDED
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
