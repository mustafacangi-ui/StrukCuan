/**
 * Anket entegrasyonu hazırlığı.
 * startSurvey(countryCode) - ülkeye göre farklı parametrelerle anket başlatır.
 * Gerçek anket SDK'sı (Typeform, Tally, vb.) eklendiğinde bu fonksiyon güncellenecek.
 */

export interface SurveyParams {
  countryCode: string;
  userId?: string;
  locale: string;
  /** Anket URL veya embed ID - ülkeye göre değişir */
  surveyId: string;
}

const SURVEY_BY_COUNTRY: Record<string, { id: string; url?: string }> = {
  ID: { id: "strukcuan-id", url: undefined },
  DE: { id: "strukcuan-de", url: undefined },
  TR: { id: "strukcuan-tr", url: undefined },
};

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
  };
}

/**
 * Anketi başlatır. Ülkeye göre farklı parametreler gönderilir.
 * TODO: Gerçek anket SDK/URL entegrasyonu yapıldığında window.open(url) ekleyin.
 */
export function startSurvey(countryCode: string | null | undefined, userId?: string): void {
  const params = getSurveyParams(countryCode, userId);

  // TODO: Gerçek anket URL'si eklendiğinde:
  // const url = `https://form.typeform.com/to/${params.surveyId}?locale=${params.locale}&country=${params.countryCode}`;
  // window.open(url, "_blank");

  if (typeof window !== "undefined") {
    // Placeholder - toast için dynamic import (sonner)
    import("sonner").then(({ toast }) => {
      toast.info(`Anket (${params.countryCode}) hazırlanıyor...`, {
        description: `locale: ${params.locale}, surveyId: ${params.surveyId}`,
      });
    });
  }
}
