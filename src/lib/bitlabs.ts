/**
 * BitLabs API integration
 * Fetches surveys from BitLabs REST API (api.bitlabs.ai/v2/client/surveys)
 */

export interface BitLabsSurvey {
  id: string;
  type: string;
  click_url: string;
  cpi: string;
  value: string;
  loi: number;
  country: string;
  language: string;
  rating: number;
  category: {
    name: string;
    name_internal: string;
    icon_name?: string;
    icon_url?: string;
  };
}

/**
 * BitLabs value to Cuan conversion.
 */
const CUAN_PER_BITLABS_VALUE = 1;

export function bitlabsValueToCuan(value: string | number): number {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value;
  return Math.max(0, Math.round(num * CUAN_PER_BITLABS_VALUE));
}

const BITLABS_API = "https://api.bitlabs.ai/v2/client/surveys";

export async function fetchBitLabsSurveys(
  userId: string | undefined,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<BitLabsSurvey[]> {
  const token = import.meta.env.VITE_BITLABS_TOKEN ?? "";

  if (!token) {
    return [];
  }

  try {
    const apiUrl = new URL(BITLABS_API);
    apiUrl.searchParams.set("token", token);
    if (userId) apiUrl.searchParams.set("uid", userId);
    apiUrl.searchParams.set("sdk", "CUSTOM");

    const res = await fetch(apiUrl.toString(), {
      headers: { "Accept": "application/json" },
    });

    const data = await res.json();
    const surveys = data?.data?.surveys ?? data?.surveys ?? [];

    return surveys as BitLabsSurvey[];
  } catch {
    const fnUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/bitlabs-surveys`;
    const url = new URL(fnUrl);
    url.searchParams.set("uid", userId ?? "");
    url.searchParams.set("token", token);

    try {
      const res = await fetch(url.toString(), {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${supabaseAnonKey}`,
        },
      });
      const json = await res.json();
      return (json.surveys ?? []) as BitLabsSurvey[];
    } catch {
      return [];
    }
  }
}
