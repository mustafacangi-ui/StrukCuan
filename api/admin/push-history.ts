import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceRoleClient, requireAdminUser } from "../_lib/adminAuth";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const supabase = createServiceRoleClient(res);
  if (!supabase) return;

  if (!(await requireAdminUser(req, res, supabase))) return;

  const { data, error } = await supabase
    .from("scheduled_push_notifications")
    .select("*")
    .eq("sent", true)
    .order("sent_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[push-history] GET error:", JSON.stringify(error));
    return res.status(500).json({
      success: false,
      message: "Failed to load history",
      error: error.message,
    });
  }

  return res.status(200).json({ success: true, history: data ?? [] });
}
