import { useCallback, useEffect, useState } from "react";
import type { CpxSurvey, CpxSurveysJson } from "@/lib/cpxResearch";

export interface UseCpxSurveysOptions {
  userId: string;
  country: string;
  language: string;
  enabled?: boolean;
}

function isErrorPayload(v: unknown): v is { success: false; message?: string; error?: string } {
  return typeof v === "object" && v !== null && (v as { success?: unknown }).success === false;
}

/**
 * CPX anket listesini `/api/cpx-surveys` üzerinden çeker (hash ve app_id sunucuda).
 */
export function useCpxSurveys(options: UseCpxSurveysOptions) {
  const { userId, country, language, enabled = true } = options;
  const [surveys, setSurveys] = useState<CpxSurvey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [debugMessage, setDebugMessage] = useState("");

  useEffect(() => {
    if (!enabled || !userId) {
      setDebugMessage(
        JSON.stringify(
          {
            surveysCount: 0,
            fetch: "skipped",
            enabled,
            hasUserId: Boolean(userId),
            error: null,
          },
          null,
          2
        )
      );
    }
  }, [enabled, userId]);

  const load = useCallback(async () => {
    if (!userId) {
      setSurveys([]);
      setDebugMessage(
        JSON.stringify(
          {
            surveysCount: 0,
            fetch: "skipped",
            reason: "no userId",
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
      const params = new URLSearchParams({
        user_id: userId,
        country: country || "",
        language: language || "en",
      });

      const res = await fetch(`/api/cpx-surveys?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const raw: unknown = await res.json();

      if (!res.ok) {
        setDebugMessage(JSON.stringify(raw, null, 2));
        if (isErrorPayload(raw)) {
          throw new Error(String(raw.error ?? raw.message ?? res.statusText));
        }
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      if (isErrorPayload(raw)) {
        setDebugMessage(JSON.stringify(raw, null, 2));
        throw new Error(String(raw.error ?? raw.message ?? "CPX error"));
      }

      const data = raw as CpxSurveysJson;
      const list = Array.isArray(data.surveys) ? data.surveys : [];
      const firstSurveyFull = list[0] ?? null;
      setDebugMessage(
        JSON.stringify(
          {
            ...data,
            firstSurveyFull,
          },
          null,
          2
        )
      );
      setSurveys(list);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setDebugMessage((prev) =>
        prev.trim()
          ? prev
          : JSON.stringify({ surveysCount: 0, error: String(err) }, null, 2)
      );
      setError(err);
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, [userId, country, language]);

  useEffect(() => {
    if (!enabled || !userId) return;
    void load();
  }, [enabled, userId, country, language, load]);

  return { surveys, setSurveys, loading, error, debugMessage, refetch: load };
}
