import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CpxPostbackLogLevel = "success" | "duplicate" | "invalid_hash" | "reversal" | "user_not_found" | "error";

export function logCpxWebhook(level: CpxPostbackLogLevel, detail: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      source: "cpx_reward_webhook",
      level,
      ts: new Date().toISOString(),
      ...detail,
    })
  );
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const raw = obj[k] ?? obj[k.toLowerCase()];
    if (raw === undefined || raw === null) continue;
    const s = String(raw).trim();
    if (s.length > 0) return s;
  }
  return undefined;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  const s = pickString(obj, keys);
  if (s === undefined) return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

export interface NormalizedCpxRewardPayload {
  status: string;
  trans_id: string;
  user_id: string;
  survey_id: string | undefined;
  survey_loi: number | undefined;
  hash: string;
  completed_at: string | undefined;
  /** Status 2: orijinal tamamlama işleminin trans_id’si (CPX alan adlarından türetilir). */
  reverse_of_trans_id: string | undefined;
  raw: Record<string, unknown>;
}

export interface ParsedWebhookRequest {
  /** URL query string (GET params). */
  query: Record<string, string>;
  /** POST/PUT/PATCH gövdesi ayrıştırılmış; GET’te {} */
  body: Record<string, unknown>;
  /** query + body birleşimi (önceki davranış). */
  merged: Record<string, unknown>;
}

/**
 * GET query + POST body (JSON veya x-www-form-urlencoded) tek seferde okur (gövde tek okunur).
 */
export async function parseWebhookRequest(request: Request): Promise<ParsedWebhookRequest> {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());

  const fromQuery: Record<string, unknown> = { ...query };
  let fromBody: Record<string, unknown> = {};

  const method = request.method.toUpperCase();
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    const ct = request.headers.get("content-type") ?? "";
    try {
      const text = await request.text();
      if (ct.includes("application/json")) {
        fromBody = text.trim() ? (JSON.parse(text) as Record<string, unknown>) : {};
      } else if (ct.includes("application/x-www-form-urlencoded")) {
        fromBody = text.length > 0 ? Object.fromEntries(new URLSearchParams(text).entries()) : {};
      } else if (text.trim().startsWith("{")) {
        fromBody = JSON.parse(text) as Record<string, unknown>;
      } else if (text.length > 0) {
        fromBody = Object.fromEntries(new URLSearchParams(text).entries());
      }
    } catch {
      fromBody = { _parse_error: true as const };
    }
  }

  return {
    query,
    body: fromBody,
    merged: { ...fromQuery, ...fromBody },
  };
}

export function normalizeCpxRewardPayload(raw: Record<string, unknown>): NormalizedCpxRewardPayload {
  const status = pickString(raw, ["status", "Status", "STATUS"]) ?? "";
  const trans_id = pickString(raw, ["trans_id", "transId", "transaction_id", "transactionId", "tid", "TransId"]) ?? "";
  const user_id =
    pickString(raw, ["user_id", "userId", "userid", "ext_user_id", "extUserId", "uid"]) ?? "";
  const survey_id = pickString(raw, ["survey_id", "surveyId", "surveyid"]);
  const survey_loi = pickNumber(raw, [
    "survey_loi",
    "surveyLoi",
    "loi",
    "length_of_interview",
    "length_of_study",
    "estimated_time",
    "time",
  ]);
  const hash = pickString(raw, ["hash", "Hash", "sig", "signature", "md5_hash", "secure_hash"]) ?? "";
  const completed_at = pickString(raw, [
    "completed_at",
    "completedAt",
    "timestamp",
    "date",
    "completed",
  ]);
  const reverse_of_trans_id = pickString(raw, [
    "original_trans_id",
    "originalTransId",
    "parent_trans_id",
    "reversed_trans_id",
    "chargeback_trans_id",
    "reverse_of_trans_id",
  ]);

  return {
    status: status.trim(),
    trans_id: trans_id.trim(),
    user_id: user_id.trim(),
    survey_id: survey_id?.trim(),
    survey_loi,
    hash: hash.trim(),
    completed_at: completed_at?.trim(),
    reverse_of_trans_id: reverse_of_trans_id?.trim(),
    raw,
  };
}

export function verifyCpxHash(transId: string, receivedHash: string, secretKey: string | undefined): boolean {
  if (!secretKey || !transId || !receivedHash) return false;
  const expected = createHash("md5").update(`${transId}-${secretKey}`, "utf8").digest("hex");
  return expected.toLowerCase() === receivedHash.toLowerCase();
}

export const getTicketCount = (minutes: number): number => {
  if (minutes < 1) return 1;
  if (minutes <= 3) return 2;
  return 3;
};

export function calculateTicketReward(status: string, surveyLoi: number | undefined): number {
  if (status !== "1" && status !== "3") return 0;
  const loi = typeof surveyLoi === "number" && Number.isFinite(surveyLoi) && surveyLoi > 0 ? surveyLoi : 0;
  if (loi <= 0) return 1;
  return getTicketCount(loi);
}

export function isValidUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export function parseCompletedAt(value: string | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

type RpcResult = { result?: string; tickets_granted?: number; tickets_revoked?: number };

export async function processCompletedReward(
  supabase: SupabaseClient,
  payload: NormalizedCpxRewardPayload,
  hashVerified: boolean
): Promise<{ result: string; tickets?: number }> {
  const tickets = calculateTicketReward(payload.status, payload.survey_loi);
  const completedIso = parseCompletedAt(payload.completed_at) ?? new Date().toISOString();

  const { data, error } = await supabase.rpc("cpx_apply_postback", {
    p_trans_id: payload.trans_id,
    p_user_id: payload.user_id,
    p_status: payload.status,
    p_survey_id: payload.survey_id ?? null,
    p_survey_loi: payload.survey_loi ?? null,
    p_tickets_to_grant: tickets,
    p_reverse_of_trans_id: null,
    p_hash_verified: hashVerified,
    p_raw: payload.raw,
    p_completed_at: completedIso,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = data as RpcResult | null;
  return { result: row?.result ?? "error", tickets: row?.tickets_granted };
}

export async function processReversalReward(
  supabase: SupabaseClient,
  payload: NormalizedCpxRewardPayload,
  hashVerified: boolean
): Promise<{ result: string }> {
  const completedIso = parseCompletedAt(payload.completed_at) ?? new Date().toISOString();

  const { data, error } = await supabase.rpc("cpx_apply_postback", {
    p_trans_id: payload.trans_id,
    p_user_id: payload.user_id,
    p_status: payload.status,
    p_survey_id: payload.survey_id ?? null,
    p_survey_loi: payload.survey_loi ?? null,
    p_tickets_to_grant: 0,
    p_reverse_of_trans_id: payload.reverse_of_trans_id ?? null,
    p_hash_verified: hashVerified,
    p_raw: payload.raw,
    p_completed_at: completedIso,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = data as RpcResult | null;
  return { result: row?.result ?? "error" };
}
