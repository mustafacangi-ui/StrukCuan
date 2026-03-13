/**
 * Ad network URLs for hybrid rewarded ad mediation.
 * Replace with your actual publisher URLs from each network's dashboard.
 * Order: Monetag → Adsterra → PropellerAds (first to load wins).
 * Note: Some networks may block iframe embedding (X-Frame-Options).
 * Monetag is configured and should work; add Adsterra/PropellerAds URLs when available.
 */
export const AD_NETWORK_URLS = [
  {
    id: "monetag",
    name: "Monetag",
    url: "https://omg10.com/4/10726900",
  },
  {
    id: "adsterra",
    name: "Adsterra",
    url: "https://delivery.adsterratools.com/direct/your-zone-id", // Replace with your Adsterra Smartlink URL
  },
  {
    id: "propellerads",
    name: "PropellerAds",
    url: "https://go.propellerads.com/your-campaign-id", // Replace with your PropellerAds direct link
  },
] as const;
