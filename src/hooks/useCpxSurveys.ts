import { useCallback, useEffect, useState } from "react";
import { fetchSurveys, type CpxSurvey, type FetchSurveysParams } from "@/lib/cpxResearch";

export interface UseCpxSurveysOptions extends FetchSurveysParams {
  /** false ise otomatik ilk yükleme yapılmaz */
  enabled?: boolean;
  /** Sadece debug log (console) */
  userId?: string | null;
}

/**
 * CPX anket listesini `fetchSurveys` ile çeker; `surveys` dizisini React state’inde tutar.
 */
export function useCpxSurveys(options: UseCpxSurveysOptions) {
  const { enabled = true, appId, extUserId, secureHash, email, subid1, subid2, hl, userId } = options;
  const [surveys, setSurveys] = useState<CpxSurvey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log({
      appId,
      userId: userId ?? undefined,
      enabled,
    });
  }, [appId, userId, enabled]);

  const load = useCallback(async () => {
    if (!appId || !extUserId) {
      setSurveys([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const json = await fetchSurveys({ appId, extUserId, secureHash, email, subid1, subid2, hl });
      console.log({
        surveysCount: json?.surveys?.length,
        surveys: json?.surveys,
        error: null,
      });
      setSurveys(json.surveys ?? []);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      console.log({
        surveysCount: undefined,
        surveys: undefined,
        error: err,
      });
      setError(err);
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, [appId, extUserId, secureHash, email, subid1, subid2, hl]);

  useEffect(() => {
    if (!enabled || !appId || !extUserId) return;
    void load();
  }, [enabled, appId, extUserId, secureHash, email, subid1, subid2, hl, load]);

  return { surveys, setSurveys, loading, error, refetch: load };
}
