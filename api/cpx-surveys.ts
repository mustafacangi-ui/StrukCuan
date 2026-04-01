import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

export const config = {
  runtime: "nodejs",
};

const CPX_GET_SURVEYS_URL = "https://live-api.cpx-research.com/api/get-surveys.php";

const DEFAULT_LAYOUT_PARAMS: Record<string, string> = {
  type: "screen",
  position: "bottom",
  width: "960",
  height: "216",
  backgroundcolor: "#ffaf20",
  textcolor: "#2b2b2b",
  rounded_corners: "true",
  transparent: "1",
  text: "",
  textsize: "60",
  sdk: "web",
  sdk_version: "1.0.0",
};

const HL_ALLOWED = new Set(["tr", "id", "de", "en"]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({
        success: false,
        message: "CPX fetch failed",
        error: "Method not allowed",
      });
    }

    const user_id = String(req.query.user_id ?? "").trim();
    const country = String(req.query.country ?? "").trim();
    const languageRaw = String(req.query.language ?? "en").trim().toLowerCase();
    const language = HL_ALLOWED.has(languageRaw) ? languageRaw : "en";

    const appId = process.env.CPX_APP_ID ?? "";
    const secret = process.env.CPX_SECRET_KEY ?? "";

    if (!appId || !secret || !user_id) {
      return res.status(400).json({
        success: false,
        message: "CPX fetch failed",
        error: "Missing CPX_APP_ID, CPX_SECRET_KEY, or user_id",
      });
    }

    const secure_hash = crypto.createHash("md5").update(`${user_id}-${secret}`).digest("hex");

    const q = new URLSearchParams();
    q.set("app_id", appId);
    q.set("ext_user_id", user_id);
    q.set("secure_hash", secure_hash);
    q.set("output_method", "jsscriptv1");
    for (const [k, v] of Object.entries(DEFAULT_LAYOUT_PARAMS)) {
      q.set(k, v);
    }
    if (country) {
      q.set("country", country);
    }
    q.set("hl", language);

    const url = `${CPX_GET_SURVEYS_URL}?${q.toString()}`;

    const cpxRes = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!cpxRes.ok) {
      throw new Error(`CPX HTTP ${cpxRes.status} ${cpxRes.statusText}`);
    }

    const data: unknown = await cpxRes.json();
    return res.status(200).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({
      success: false,
      message: "CPX fetch failed",
      error: message,
    });
  }
}
