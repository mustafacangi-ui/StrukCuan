/**
 * Hybrid rewarded ad mediation - configurable ad network URLs.
 * All networks load in parallel; first to load within 5s displays.
 * Order: Adsterra → Monetag → PropellerAds (try next if current fails).
 *
 * Replace placeholder URLs with your actual publisher links:
 * - Adsterra: Smartlink URL from publisher dashboard
 * - Monetag: Zone/direct link from Monetag dashboard
 * - PropellerAds: Direct link from PropellerAds dashboard
 */
export const adNetworks = [
  {
    name: "adsterra",
    url: import.meta.env.VITE_ADSTERRA_SMARTLINK ?? "https://delivery.adsterratools.com/direct/your-zone-id",
  },
  {
    name: "monetag",
    url: import.meta.env.VITE_MONETAG_ZONE_LINK ?? "https://omg10.com/4/10726900",
  },
  {
    name: "propeller",
    url: import.meta.env.VITE_PROPELLER_DIRECT_LINK ?? "https://go.propellerads.com/your-campaign-id",
  },
] as const;

export type AdNetworkName = (typeof adNetworks)[number]["name"];
