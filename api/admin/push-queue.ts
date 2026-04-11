import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createServiceRoleClient, requireAdminUser } from "../_lib/adminAuth";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabase = createServiceRoleClient(res);
  if (!supabase) return;

  if (!(await requireAdminUser(req, res, supabase))) return;

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("scheduled_push_notifications")
      .select("*")
      .eq("sent", false)
      .order("scheduled_for", { ascending: true });

    if (error) {
      console.error("[push-queue] GET error:", JSON.stringify(error));
      return res.status(500).json({
        success: false,
        message: "Failed to load queue",
        error: error.message,
      });
    }
    return res.status(200).json({ success: true, queue: data ?? [] });
  }

  if (req.method === "DELETE") {
    const raw = req.query.id;
    const id = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (!id?.trim()) {
      return res.status(400).json({ success: false, message: "Query parameter id is required" });
    }

    const { error } = await supabase.from("scheduled_push_notifications").delete().eq("id", id.trim());

    if (error) {
      console.error("[push-queue] DELETE error:", JSON.stringify(error));
      return res.status(500).json({
        success: false,
        message: "Failed to delete",
        error: error.message,
      });
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}
