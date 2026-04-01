import { createHash } from "node:crypto";

export const config = {
  runtime: "nodejs",
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const trans_id = url.searchParams.get("trans_id")?.trim() ?? "";
  const hash = url.searchParams.get("hash")?.trim() ?? "";
  const secret = process.env.CPX_SECRET_KEY ?? "";

  const expected = createHash("md5")
    .update(`${trans_id}-${secret}`, "utf8")
    .digest("hex");

  if (!secret || !trans_id || !hash || expected.toLowerCase() !== hash.toLowerCase()) {
    return Response.json({ success: false, message: "Invalid hash" }, { status: 403 });
  }

  return Response.json({ success: true, message: "Hash valid" });
}
