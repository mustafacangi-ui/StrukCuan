/**
 * CPX Research — anket listesi (JSON API).
 * Resmi mobil SDK ile aynı endpoint: live-api.cpx-research.com/api/get-surveys.php + output_method=jsscriptv1
 * @see https://github.com/MakeOpinionGmbH/cpx-research-SDK-Ios (NetworkService.swift)
 */

const CPX_GET_SURVEYS_URL = "https://live-api.cpx-research.com/api/get-surveys.php";
export const CPX_OFFERS_URL = "https://offers.cpx-research.com/index.php";

/** UI + API dil parametresi (`hl`) için tarayıcı dilinden türetilir. */
export function getCpxUiLanguage(): "id" | "en" {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("id") ? "id" : "en";
}

/** Stil parametreleri SDK’nın get-surveys isteğinde kullandığı alanlarla uyumludur (web için sabit varsayılanlar). */
const DEFAULT_LAYOUT_PARAMS: Record<string, string> = {
  type: "screen",
  position: "bottom",
  width: "960",
  height: "216",
  backgroundcolor: "#ffaf20",
  textcolor: "#2b2b2b",
  rounded_corners: "true",
  transparent: "1",
  text: "",
  textsize: "60",
  sdk: "web",
  sdk_version: "1.0.0",
};

export interface CpxSurvey {
  id: string;
  loi: number;
  payout: string;
  conversion_rate: string;
  statistics_rating_count: number;
  statistics_rating_avg: number;
  type: string;
  top: number;
  details?: number;
  webcam?: number;
  category?: string;
  /** Bazı yanıtlarda anket URL’si doğrudan gelir. */
  href?: string;
  /** Tahmini süre (dakika); yoksa `loi` kullanılır. */
  estimated_time?: number;
  /** Yerel para tutarı (IDR) — yoksa `payout` yedek olarak kullanılır. */
  amount_local_money?: number | string;
  provider?: string;
  score?: string;
  click_to_okay_rate?: string;
  quality_score?: string;
  earned_all?: number;
  payout_original?: string;
  open_external?: string;
  additional_parameter?: Record<string, unknown>;
}

export interface CpxSurveysJson {
  status: string;
  count_available_surveys: number;
  count_returned_surveys: number;
  transactions?: unknown[];
  surveys: CpxSurvey[];
  text?: unknown;
}

export interface FetchSurveysParams {
  appId: string;
  extUserId: string;
  /**
   * Publisher alanında secure hash açıksa: MD5(ext_user_id + "-" + paneldeki gizli anahtar).
   * Üretimi sunucu tarafında yapmanız önerilir; burada hazır hash iletilir.
   */
  secureHash?: string;
  email?: string;
  subid1?: string;
  subid2?: string;
  /** API `hl` parametresi; verilmezse `getCpxUiLanguage()` kullanılır. */
  hl?: "id" | "en";
}

function buildGetSurveysSearchParams(params: FetchSurveysParams): URLSearchParams {
  const q = new URLSearchParams();
  q.set("app_id", params.appId);
  q.set("ext_user_id", params.extUserId);
  q.set("output_method", "jsscriptv1");
  for (const [k, v] of Object.entries(DEFAULT_LAYOUT_PARAMS)) {
    q.set(k, v);
  }
  if (params.secureHash) {
    q.set("secure_hash", params.secureHash);
  }
  if (params.email) {
    q.set("email", params.email);
  }
  if (params.subid1) {
    q.set("subid1", params.subid1);
  }
  if (params.subid2) {
    q.set("subid2", params.subid2);
  }
  const language = params.hl ?? getCpxUiLanguage();
  q.set("hl", language);
  return q;
}

export function buildCpxSurveyOfferUrl(params: {
  appId: string;
  extUserId: string;
  surveyId: string;
  secureHash?: string;
  username?: string;
  email?: string;
}): string {
  const u = new URL(CPX_OFFERS_URL);
  u.searchParams.set("app_id", params.appId);
  u.searchParams.set("ext_user_id", params.extUserId);
  u.searchParams.set("survey_id", params.surveyId);
  if (params.secureHash) {
    u.searchParams.set("secure_hash", params.secureHash);
  }
  if (params.username) {
    u.searchParams.set("username", params.username);
  }
  if (params.email) {
    u.searchParams.set("email", params.email);
  }
  return u.toString();
}

/**
 * CPX Research’ten güncel anket listesini çeker.
 * Dönüşteki `surveys` alanı API ile birebir aynıdır.
 */
export async function fetchSurveys(params: FetchSurveysParams): Promise<CpxSurveysJson> {
  const language =
    params.hl ??
    (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("id") ? "id" : "en");
  const url = new URL(CPX_GET_SURVEYS_URL);
  const q = buildGetSurveysSearchParams({ ...params, hl: language });
  url.search = q.toString();

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`CPX surveys request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as CpxSurveysJson;
  if (!Array.isArray(data.surveys)) {
    return { ...data, surveys: [] };
  }
  return data;
}
