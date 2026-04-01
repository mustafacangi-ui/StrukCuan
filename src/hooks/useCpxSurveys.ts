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
  const { enabled = true, appId, extUserId, secureHash, email, subid1, subid2, hl } = options;
  const [surveys, setSurveys] = useState<CpxSurvey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [debugMessage, setDebugMessage] = useState("");

  useEffect(() => {
    if (!enabled || !appId || !extUserId) {
      setDebugMessage(
        JSON.stringify(
          {
            surveysCount: 0,
            fetch: "skipped",
            enabled,
            hasAppId: Boolean(appId),
            hasExtUserId: Boolean(extUserId),
            error: null,
          },
          null,
          2
        )
      );
    }
  }, [enabled, appId, extUserId]);

  const load = useCallback(async () => {
    if (!appId || !extUserId) {
      setSurveys([]);
      setDebugMessage(
        JSON.stringify(
          {
            surveysCount: 0,
            fetch: "skipped",
            reason: !appId ? "no appId" : "no extUserId",
            error: null,
          },
          null,
          2
        )
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSurveys({ appId, extUserId, secureHash, email, subid1, subid2, hl });
      const debugMsg = JSON.stringify(
        {
          surveysCount: data?.surveys?.length ?? 0,
          firstSurvey: data?.surveys?.[0] ?? null,
          error: null,
        },
        null,
        2
      );
      setDebugMessage(debugMsg);
      setSurveys(data.surveys ?? []);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setDebugMessage(
        JSON.stringify(
          {
            surveysCount: 0,
            error: String(err),
          },
          null,
          2
        )
      );
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

  return { surveys, setSurveys, loading, error, debugMessage, refetch: load };
}
