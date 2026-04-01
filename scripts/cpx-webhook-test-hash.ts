/**
 * Local helper: CPX webhook URL with a valid MD5 hash for manual testing.
 *
 * Usage (PowerShell):
 *   $env:CPX_SECRET_KEY="your-secret"; npx tsx scripts/cpx-webhook-test-hash.ts
 *
 * Usage (bash):
 *   CPX_SECRET_KEY=your-secret npx tsx scripts/cpx-webhook-test-hash.ts
 */
import { createHash } from "node:crypto";

const trans_id = "test123";
const secret = process.env.CPX_SECRET_KEY ?? "";

if (!secret) {
  console.error("Missing CPX_SECRET_KEY. Set it in the environment before running this script.");
  process.exit(1);
}

const generatedHash = createHash("md5").update(`${trans_id}-${secret}`).digest("hex");

const url = `https://www.strukcuan.com/api/webhooks/cpx-reward?status=1&trans_id=test123&user_id=test-user&survey_loi=4&hash=${generatedHash}`;

console.log(url);
