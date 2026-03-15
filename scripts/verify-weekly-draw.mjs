/**
 * Weekly Draw Verification Script
 * Run: node scripts/verify-weekly-draw.mjs
 * Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 */

import { createClient } from "@supabase/supabase-js";
import { getISOWeek } from "date-fns";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Load .env manually (try project root)
for (const p of [resolve(root, ".env"), resolve(process.cwd(), ".env")]) {
  try {
    const env = readFileSync(p, "utf-8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    break;
  } catch (_) {}
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

// Match PostgreSQL extract(week from ...) - ISO week
const curWeek = getISOWeek(new Date());

async function run() {
  const report = [];
  let allPass = true;

  // 1. weekly_winners: new rows in last 10 minutes
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recentWinners, error: e1 } = await supabase
    .from("weekly_winners")
    .select("id, user_id, created_at")
    .gte("created_at", tenMinAgo);

  const chk1 = !e1 && recentWinners && recentWinners.length > 0;
  report.push({
    check: "1. weekly_winners (last 10 min)",
    result: chk1 ? `${recentWinners.length} new row(s)` : "0 rows",
    status: chk1 ? "PASS" : "FAIL",
  });
  if (!chk1) allPass = false;

  // 2. lottery_tickets: should be cleared (no old week tickets)
  const { data: allTickets, error: e2 } = await supabase
    .from("lottery_tickets")
    .select("draw_week");

  let oldTickets = 0;
  if (!e2 && allTickets) {
    oldTickets = allTickets.filter((t) => t.draw_week < curWeek).length;
  }
  const chk2 = oldTickets === 0;
  report.push({
    check: "2. lottery_tickets cleared",
    result: `old_week_tickets=${oldTickets}, total=${allTickets?.length ?? 0}`,
    status: chk2 ? "PASS" : "FAIL",
  });
  if (!chk2) allPass = false;

  // 3. user_tickets: reset for new week
  const { data: userTickets, error: e3 } = await supabase
    .from("user_tickets")
    .select("draw_week");

  let oldUserTickets = 0;
  if (!e3 && userTickets) {
    oldUserTickets = userTickets.filter((t) => t.draw_week < curWeek).length;
  }
  report.push({
    check: "3. user_tickets reset",
    result: `old_week_rows=${oldUserTickets}`,
    status: oldUserTickets === 0 ? "PASS" : "CHECK (old weeks present)",
  });

  // 4. No duplicate winners in same draw (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: winners7d, error: e4 } = await supabase
    .from("weekly_winners")
    .select("user_id, created_at")
    .gte("created_at", sevenDaysAgo);

  let hasDupes = false;
  if (!e4 && winners7d && winners7d.length > 0) {
    const byDate = {};
    for (const w of winners7d) {
      const d = w.created_at?.slice(0, 10) ?? "";
      if (!byDate[d]) byDate[d] = {};
      byDate[d][w.user_id] = (byDate[d][w.user_id] || 0) + 1;
    }
    for (const day of Object.values(byDate)) {
      if (Object.values(day).some((c) => c > 1)) {
        hasDupes = true;
        break;
      }
    }
  }
  report.push({
    check: "4. no duplicate winners",
    result: hasDupes ? "FAIL: duplicates found" : "PASS (none)",
    status: hasDupes ? "FAIL" : "PASS",
  });
  if (hasDupes) allPass = false;

  // Print report
  console.log("\n--- Weekly Draw Verification Report ---\n");
  for (const r of report) {
    console.log(`${r.check}: ${r.result} [${r.status}]`);
  }
  console.log("\n--- Summary ---");
  console.log(allPass ? "Weekly draw appears to have run correctly." : "Issues detected. See failures above.");
  if (e1) console.error("Error 1:", e1);
  if (e2) console.error("Error 2:", e2);
  if (e3) console.error("Error 3:", e3);
  if (e4) console.error("Error 4:", e4);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
