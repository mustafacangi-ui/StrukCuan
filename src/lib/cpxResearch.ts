/**
 * CPX Research — anket listesi (JSON API).
 * Resmi mobil SDK ile aynı endpoint: live-api.cpx-research.com/api/get-surveys.php + output_method=jsscriptv1
 * @see https://github.com/MakeOpinionGmbH/cpx-research-SDK-Ios (NetworkService.swift)
 */

/** CPX `hl` API parametresi — cihaz diline göre seçilir. */
export type CpxSurveyLanguage = "tr" | "id" | "de" | "en";

/**
 * `navigator.language` ile anket listesi dili (`hl`).
 * tr-*, id-*, de-*, en-* önekleri; aksi halde `en`.
 */
export function getCpxUiLanguage(): CpxSurveyLanguage {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("tr")) return "tr";
  if (lang.startsWith("id")) return "id";
  if (lang.startsWith("de")) return "de";
  if (lang.startsWith("en")) return "en";
  return "en";
}

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
  /** CPX yanıtında alternatif URL alanları (hangisi doluysa açılışta kullanılır). */
  url?: string;
  click_url?: string;
  link?: string;
  offer_url?: string;
  transaction_url?: string;
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

