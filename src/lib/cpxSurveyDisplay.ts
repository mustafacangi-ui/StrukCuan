import { buildCpxSurveyOfferUrl, type CpxSurvey } from "@/lib/cpxResearch";

export const getTicketCount = (minutes: number): number => {
  if (minutes < 1) return 1;
  if (minutes <= 3) return 2;
  return 3;
};

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

export function formatSurveyAmountIdr(survey: CpxSurvey): string {
  let amount = 0;
  if (survey.amount_local_money != null) {
    const raw = survey.amount_local_money;
    amount = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/,/g, ""));
  } else {
    amount = parseFloat(String(survey.payout ?? "0"));
  }
  if (!Number.isFinite(amount)) amount = 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function resolveCpxSurveyHref(
  survey: CpxSurvey,
  ctx: { appId: string; extUserId: string; secureHash?: string; email?: string; username?: string }
): string {
  const href = survey.href;
  if (typeof href === "string" && /^https?:\/\//i.test(href.trim())) {
    return href.trim();
  }
  return buildCpxSurveyOfferUrl({
    appId: ctx.appId,
    extUserId: ctx.extUserId,
    surveyId: survey.id,
    secureHash: ctx.secureHash,
    email: ctx.email,
    username: ctx.username,
  });
}
