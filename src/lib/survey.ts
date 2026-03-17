/**
 * Anket entegrasyonu - CPX Research / Pollfish
 * startSurvey: Gerçek sağlayıcı URL'ini açar veya widget yükler.
 * Callback: Supabase Edge Function (survey-callback) webhook ile ödül yansıtma.
 */

export interface SurveyParams {
  countryCode: string;
  userId?: string;
  locale: string;
  surveyId: string;
  /** CPX veya Pollfish - sağlayıcıya göre URL */
  provider: "cpx" | "pollfish";
}

const SURVEY_BY_COUNTRY: Record<string, { id: string; cpxId?: string; pollfishId?: string }> = {
  ID: { id: "strukcuan-id", cpxId: "strukcuan-id", pollfishId: "strukcuan-id" },
  DE: { id: "strukcuan-de", cpxId: "strukcuan-de", pollfishId: "strukcuan-de" },
  TR: { id: "strukcuan-tr", cpxId: "strukcuan-tr", pollfishId: "strukcuan-tr" },
};

/** Webhook URL - Supabase Edge Function. CPX/Pollfish dashboard'da bu URL'i callback olarak yapılandırın. */
export function getSurveyCallbackUrl(): string {
  const url = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${url}/functions/v1/survey-callback`;
}

/**
 * Ülkeye göre anket parametrelerini döndürür.
 */
export function getSurveyParams(countryCode: string | null | undefined, userId?: string): SurveyParams {
  const code = (countryCode ?? "ID").toUpperCase().slice(0, 2);
  const config = SURVEY_BY_COUNTRY[code] ?? SURVEY_BY_COUNTRY.ID;
  const localeMap: Record<string, string> = { ID: "id", DE: "de", TR: "tr" };
  const locale = localeMap[code] ?? "en";

  return {
    countryCode: code,
    userId,
    locale,
    surveyId: config.id,
    provider: "cpx",
  };
}

/**
 * CPX Research URL - app_id ile survey sayfası.
 * CPX dashboard: https://www.cpx-research.com → app_id alın.
 */
function buildCpxUrl(params: SurveyParams): string {
  const appId = import.meta.env.VITE_CPX_APP_ID ?? "";
  if (!appId) {
    return ""; // Env yoksa boş - startSurvey fallback kullanır
  }
  const callback = encodeURIComponent(getSurveyCallbackUrl());
  const uid = params.userId ? encodeURIComponent(params.userId) : "";
  return `https://www.cpx-research.com/main/survey.html?app_id=${appId}&locale=${params.locale}&country=${params.countryCode}&uid=${uid}&callback=${callback}`;
}

/**
 * Pollfish URL - API key ile survey.
 * Pollfish dashboard: https://www.pollfish.com → API key alın.
 */
function buildPollfishUrl(params: SurveyParams): string {
  const apiKey = import.meta.env.VITE_POLLFISH_API_KEY ?? "";
  if (!apiKey) return "";
  const callback = encodeURIComponent(getSurveyCallbackUrl());
  const uid = params.userId ? encodeURIComponent(params.userId) : "";
  return `https://www.pollfish.com/web/survey?api_key=${apiKey}&locale=${params.locale}&country=${params.countryCode}&uid=${uid}&callback=${callback}`;
}

/**
 * Anketi başlatır. CPX/Pollfish URL'ini açar.
 * Kullanıcı anket tamamladığında sağlayıcı survey-callback webhook'unu çağırır.
 * .env'de VITE_CPX_APP_ID veya VITE_POLLFISH_API_KEY tanımlayın.
 */
export function startSurvey(countryCode: string | null | undefined, userId?: string): void {
  const params = getSurveyParams(countryCode, userId);

  const url = params.provider === "pollfish"
    ? buildPollfishUrl(params)
    : buildCpxUrl(params);

  if (typeof window !== "undefined") {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      import("sonner").then(({ toast }) => {
        toast.info("Anket açıldı", {
          description: "Tamamladığınızda Cuan otomatik hesabınıza eklenir.",
        });
      });
    } else {
      import("sonner").then(({ toast }) => {
        toast.info("Anket hazırlanıyor", {
          description: "VITE_CPX_APP_ID veya VITE_POLLFISH_API_KEY ile .env dosyasını yapılandırın.",
        });
      });
    }
  }
}

/**
 * Client-side callback: Kullanıcı anket sayfasından döndüğünde (poll/redirect) ödül yansıtma.
 * Pollfish/CPX bazen URL callback kullanır; bu durumda bu sayfa çağrılır.
 * Örnek: /survey-callback?user_id=xxx&transaction_id=yyy&user_cuan=50&gross_profit=10
 */
export async function reportSurveyCompletionFromClient(
  supabase: { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  payload: { userId: string; transactionId?: string; userCuan: number; grossProfit: number; provider?: string }
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc("survey_completion_callback", {
    p_user_id: payload.userId,
    p_provider: payload.provider ?? "other",
    p_user_cuan: payload.userCuan,
    p_gross_profit: payload.grossProfit,
    p_transaction_id: payload.transactionId ?? null,
    p_survey_id: null,
    p_country_code: "ID",
    p_metadata: null,
  });

  if (error) return { success: false, error: error.message };
  return { success: (data as { success?: boolean })?.success ?? true };
}
