import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

export const config = {
  runtime: "nodejs",
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const transId = String(req.query.trans_id ?? "");
    const incomingHash = String(req.query.hash ?? "");
    const secret = process.env.CPX_SECRET_KEY ?? "";

    if (!secret || !transId || !incomingHash) {
      return res.status(403).json({
        success: false,
        message: "Invalid hash",
      });
    }

    const generatedHash = crypto.createHash("md5").update(`${transId}-${secret}`).digest("hex");

    if (generatedHash.toLowerCase() !== incomingHash.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: "Invalid hash",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hash valid",
    });
  } catch (error) {
    console.error("CPX webhook error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook crashed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
