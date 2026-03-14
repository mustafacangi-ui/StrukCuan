/**
 * Monetag rewarded ad - single network until others are configured.
 */
export const AD_NETWORKS = [
  {
    name: "Monetag",
    url: "https://omg10.com/4/10726990",
  },
] as const;

export type AdNetworkName = (typeof AD_NETWORKS)[number]["name"];
