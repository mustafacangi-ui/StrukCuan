import type { CpxSurvey } from "@/lib/cpxResearch";

/**
 * Converts CPX payout (USD) to ticket count based on thresholds.
 * payout < 0.20 => 1 ticket
 * payout 0.20 - 0.75 => 2 tickets
 * payout > 0.75 => 3 tickets
 */
export const getTicketCount = (payoutOrMinutes: number | string): number => {
  const payout = typeof payoutOrMinutes === "string" 
    ? parseFloat(payoutOrMinutes.replace(/,/g, "")) 
    : payoutOrMinutes;
    
  if (isNaN(payout) || payout < 0.20) return 1;
  if (payout <= 0.75) return 2;
  return 3;
};

export function getTicketCountLabel(tickets: number, isIndonesian = false): string {
  if (isIndonesian) {
    return `Dapatkan ${tickets} Tiket`;
  }
  return `Earn ${tickets} Tickets`;
}

export function getSurveyMinutes(survey: CpxSurvey): number {
  const est = survey.estimated_time;
  if (typeof est === "number" && Number.isFinite(est) && est > 0) {
    return Math.max(1, Math.round(est));
  }
  const loi = survey.loi;
  if (typeof loi === "number" && Number.isFinite(loi) && loi > 0) {
    return Math.max(1, Math.round(loi));
  }
  return 1;
}

/**
 * Payout amounts are now hidden from users. 
 * This returns an empty string or generic label.
 */
export function formatSurveyAmountIdr(_survey: CpxSurvey): string {
  return "";
}


function pickHttpUrl(
  ...candidates: Array<string | number | undefined | null>
): string {
  for (const c of candidates) {
    if (c == null) continue;
    const t = String(c).trim();
    if (/^https?:\/\//i.test(t)) return t;
  }
  return "";
}

/**
 * CPX anket kartı açılış URL’si — API hangi alanı doldurduysa normalize edilir.
 */
export function resolveCpxSurveyHref(survey: CpxSurvey): string {
  return pickHttpUrl(
    survey.href,
    survey.url,
    survey.click_url,
    survey.link,
    survey.offer_url,
    survey.transaction_url
  );
}
