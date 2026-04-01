import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

export const config = {
  runtime: "nodejs",
};

function getTicketCount(minutes: number): number {
  if (minutes < 1) return 1;
  if (minutes <= 3) return 2;
  return 3;
}

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

    const status = String(req.query.status ?? "");
    const userId = String(req.query.user_id ?? "");
    const loiRaw = req.query.survey_loi;
    const loiStr = Array.isArray(loiRaw) ? loiRaw[0] : loiRaw;
    const surveyLoiParsed = Number.parseFloat(String(loiStr ?? ""));
    const survey_loi = Number.isFinite(surveyLoiParsed) ? surveyLoiParsed : 0;

    if (status !== "1" && status !== "3") {
      return res.status(200).json({
        success: true,
        message: "Ignored status",
      });
    }

    const tickets = getTicketCount(survey_loi);

    return res.status(200).json({
      success: true,
      message: "Reward processed",
      user_id: userId,
      survey_loi,
      tickets,
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
