/**
 * Hybrid rewarded ad mediation - Adsterra, Monetag, PropellerAds.
 * All networks load in parallel; first to load within 5s displays.
 * Order: Adsterra → Monetag → PropellerAds (try next if current fails).
 */
export const adNetworks = [
  {
    name: "adsterra",
    url: import.meta.env.VITE_ADSTERRA_SMARTLINK ?? "https://www.effectivegatecpm.com/s5eup1xskn?key=ed7ce8f834a8b35ed3d8db6030a9e103",
  },
  {
    name: "monetag",
    url: import.meta.env.VITE_MONETAG_ZONE_LINK ?? "https://omg10.com/4/10728136",
  },
  {
    name: "propeller",
    url: import.meta.env.VITE_PROPELLER_DIRECT_LINK ?? "https://go.propellerads.com/PLACE_PROP_LINK_HERE",
  },
] as const;

export type AdNetworkName = (typeof adNetworks)[number]["name"];
