import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Trophy, Ticket, ChevronRight, Star, Clock, Zap, Gift, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import LegalFooter from "@/components/LegalFooter";
import {
  useTotalTicketsThisWeek,
  useLastWinner,
  useLastDrawWinningBallots,
  useMyDrawEntries,
  useEnsureDrawEntries,
  useAllWinners,
} from "@/hooks/useWeeklyDraw";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { PREMIUM_PAGE_BACKGROUND } from "@/lib/designTokens";

const TICKETS_PER_ENTRY = 10;
const PRIZE_PER_WINNER = 50_000;
const WINNERS_COUNT = 5;

function getNextDrawTime(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  let daysToAdd = (7 - day) % 7;
  if (daysToAdd === 0 && hour >= 17) daysToAdd = 7;
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + daysToAdd);
  next.setUTCHours(14, 0, 0, 0);
  return next;
}

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const update = () => {
      const diff = targetDate.getTime() - new Date().getTime();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center rounded-2xl py-3 px-1"
      style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(236,72,153,0.1))",
        border: "1px solid rgba(139,92,246,0.3)",
        boxShadow: "0 0 20px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}>
      <span className="text-2xl font-black text-white tabular-nums font-mono"
        style={{ textShadow: "0 0 20px rgba(168,85,247,0.8)" }}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-purple-300/60 mt-0.5">{label}</span>
    </div>
  );
}

function DrawCodeChip({ code, threshold }: { code: string; threshold: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl"
      style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.1))",
        border: "1px solid rgba(168,85,247,0.35)",
        boxShadow: "0 0 12px rgba(168,85,247,0.15)",
      }}
    >
      <span className="text-xs font-black text-white font-mono tracking-wider"
        style={{ textShadow: "0 0 10px rgba(168,85,247,0.7)" }}>
        {code}
      </span>
      <span className="text-[8px] text-purple-300/50">Entry #{threshold / 10}</span>
    </motion.div>
  );
}

export default function WeeklyDraw() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const nextDraw = getNextDrawTime();
  const { days, hours, minutes, seconds } = useCountdown(nextDraw);

  const { data: totalPoolTickets } = useTotalTicketsThisWeek();
  const { data: lastWinner } = useLastWinner();
  const { data: winningBallots = [] } = useLastDrawWinningBallots();
  const { data: myEntries = [], isLoading: entriesLoading } = useMyDrawEntries();
  const { data: allWinners = [] } = useAllWinners();
  const { data: stats } = useUserStats(user?.id);
  const ensureEntries = useEnsureDrawEntries();

  const [showWinners, setShowWinners] = useState(false);

  const myTickets = stats?.tiket ?? 0;
  const myEntryCount = myEntries.length;
  const ticketsToNextEntry = TICKETS_PER_ENTRY - (myTickets % TICKETS_PER_ENTRY);
  const progressPct = ((myTickets % TICKETS_PER_ENTRY) / TICKETS_PER_ENTRY) * 100;

  // Ensure entries are minted when page loads
  useEffect(() => {
    if (user?.id && myTickets >= TICKETS_PER_ENTRY) {
      ensureEntries.mutate();
    }
  }, [user?.id, myTickets]);

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto relative overflow-hidden">
      <div className="fixed inset-0 -z-10" style={{ background: PREMIUM_PAGE_BACKGROUND }} />

      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] -z-10 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(ellipse, rgba(168,85,247,0.6) 0%, rgba(236,72,153,0.3) 50%, transparent 80%)" }} />

      <PageHeader title="Weekly Draw" onBack={() => navigate(-1)} />

      <div className="px-4 pt-4 space-y-4">

        {/* ── HERO PRIZE CARD ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="relative overflow-hidden rounded-3xl p-5"
          style={{
            background: "linear-gradient(135deg, rgba(88,28,135,0.6) 0%, rgba(131,24,67,0.5) 50%, rgba(29,78,216,0.4) 100%)",
            border: "1px solid rgba(168,85,247,0.4)",
            boxShadow: "0 0 40px rgba(168,85,247,0.2), 0 0 80px rgba(236,72,153,0.1)",
          }}>

          {/* Decorative orbs */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-30 blur-2xl"
            style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-20 blur-2xl"
            style={{ background: "radial-gradient(circle, #ec4899, transparent)" }} />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-full flex items-center justify-center"
                style={{ background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)" }}>
                <Trophy size={12} className="text-amber-300" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-purple-300/70 font-bold">Weekly Reward</span>
            </div>

            <h1 className="text-2xl font-black text-white leading-tight mb-1"
              style={{ textShadow: "0 0 30px rgba(168,85,247,0.5)" }}>
              Win Rp{PRIZE_PER_WINNER.toLocaleString("id-ID")}
            </h1>
            <p className="text-sm text-pink-300/80 mb-4">Indomaret Voucher · {WINNERS_COUNT} winners every week</p>

            {/* Prize Pool Box */}
            <div className="rounded-2xl p-3 mb-4"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(10px)",
              }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-white/40 mb-0.5">Weekly Prize Pool</p>
                  <p className="text-sm font-bold text-white">{WINNERS_COUNT} × Rp{PRIZE_PER_WINNER.toLocaleString("id-ID")} vouchers</p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: WINNERS_COUNT }).map((_, i) => (
                    <div key={i} className="h-6 w-6 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
                      <Gift size={10} className="text-amber-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-purple-400" />
              <span className="text-xs text-purple-300/70">Every {TICKETS_PER_ENTRY} tickets = 1 draw entry</span>
            </div>
          </div>
        </motion.div>

        {/* ── COUNTDOWN ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl p-4"
          style={{
            background: "rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
          }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-pink-400" />
            <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Draw Countdown</p>
          </div>
          <div className="flex gap-2">
            <CountdownBox value={days} label="Days" />
            <CountdownBox value={hours} label="Hours" />
            <CountdownBox value={minutes} label="Min" />
            <CountdownBox value={seconds} label="Sec" />
          </div>
        </motion.div>

        {/* ── MY ENTRIES & PROGRESS ── */}
        {user && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-3xl p-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(17,24,39,0.9), rgba(88,28,135,0.15))",
              border: "1px solid rgba(168,85,247,0.25)",
              boxShadow: "0 0 30px rgba(168,85,247,0.08)",
            }}>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Ticket size={15} className="text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Your Entries</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black text-purple-300"
                style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.3)" }}>
                {myEntryCount} {myEntryCount === 1 ? "entry" : "entries"}
              </span>
            </div>

            {/* Ticket Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Tickets", value: myTickets },
                { label: "Entries", value: myEntryCount },
                { label: "Until Next", value: myTickets % TICKETS_PER_ENTRY === 0 && myTickets > 0 ? 10 : ticketsToNextEntry },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl p-2.5 text-center"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-lg font-black text-white">{value}</p>
                  <p className="text-[8px] uppercase tracking-wider text-white/40">{label}</p>
                </div>
              ))}
            </div>

            {/* Progress bar to next entry */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-purple-300/60">Progress to next entry</span>
                <span className="text-[10px] font-bold text-purple-300">{myTickets % TICKETS_PER_ENTRY}/{TICKETS_PER_ENTRY}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #a855f7, #ec4899)" }}
                />
              </div>
            </div>

            {/* Draw Codes */}
            {entriesLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(168,85,247,0.1)" }} />
                ))}
              </div>
            ) : myEntries.length > 0 ? (
              <div>
                <p className="text-[9px] uppercase tracking-widest text-white/30 mb-2">Your draw codes this week</p>
                <div className="grid grid-cols-3 gap-2">
                  {myEntries.map((entry) => (
                    <DrawCodeChip key={entry.draw_code} code={entry.draw_code} threshold={entry.ticket_threshold} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-3 text-center"
                style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.15)" }}>
                <p className="text-xs text-purple-300/60">
                  Earn {TICKETS_PER_ENTRY} tickets to get your first draw code!
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── EARN MORE CTA ── */}
        <motion.button
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          type="button"
          onClick={() => navigate("/earn")}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-4 font-black text-sm text-white relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #6d28d9, #db2777, #2563eb)",
            boxShadow: "0 0 30px rgba(168,85,247,0.4), 0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <div className="absolute inset-0 opacity-20"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }} />
          <Ticket size={18} />
          Earn More Tickets
          <ChevronRight size={18} />
        </motion.button>

        {/* ── LAST WINNER ── */}
        {lastWinner && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="rounded-3xl p-4 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(120,53,15,0.4), rgba(17,24,39,0.8))",
              border: "1px solid rgba(251,191,36,0.25)",
              boxShadow: "0 0 25px rgba(251,191,36,0.08)",
            }}>
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-xl opacity-20"
              style={{ background: "radial-gradient(circle, #fbbf24, transparent)" }} />

            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-amber-400" />
              <p className="text-[10px] uppercase tracking-widest text-amber-400/70 font-bold">Latest Winner</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center"
                style={{ background: "rgba(251,191,36,0.15)", border: "1.5px solid rgba(251,191,36,0.4)" }}>
                <Trophy size={16} className="text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-200 truncate">
                  {lastWinner.winner_name ?? `User-${lastWinner.user_id?.slice(0, 6)}`}
                </p>
                {lastWinner.draw_date && (
                  <p className="text-[10px] text-white/40">{lastWinner.draw_date}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-amber-300">
                  Rp{((lastWinner.voucher_amount ?? lastWinner.prize_amount ?? PRIZE_PER_WINNER)).toLocaleString("id-ID")}
                </p>
                {(lastWinner.draw_code ?? lastWinner.winning_ballot_id) && (
                  <p className="text-[9px] text-amber-400/50 font-mono">
                    #{lastWinner.draw_code ?? lastWinner.winning_ballot_id}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── WINNER HISTORY ── */}
        {allWinners.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-3xl overflow-hidden"
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
            <button
              onClick={() => setShowWinners(!showWinners)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-amber-400/70" />
                <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Winner History</span>
              </div>
              {showWinners ? <ChevronUp size={16} className="text-white/40" /> : <ChevronDown size={16} className="text-white/40" />}
            </button>

            <AnimatePresence>
              {showWinners && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2 border-t border-white/5">
                    {allWinners.slice(0, 10).map((w) => (
                      <div key={w.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center"
                            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
                            <Trophy size={10} className="text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-white truncate">
                              {w.winner_name ?? `User-${w.user_id?.slice(0, 6)}`}
                            </p>
                            {w.draw_date && <p className="text-[9px] text-white/30">{w.draw_date}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs font-bold text-amber-300">
                            Rp{((w.voucher_amount ?? w.prize_amount ?? PRIZE_PER_WINNER)).toLocaleString("id-ID")}
                          </p>
                          {(w.draw_code ?? w.winning_ballot_id) && (
                            <p className="text-[8px] text-purple-400/50 font-mono">#{w.draw_code ?? w.winning_ballot_id}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── HOW IT WORKS ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-3xl p-4"
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
          <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-3">How It Works</p>
          <div className="space-y-2.5">
            {[
              { icon: Ticket, color: "#a855f7", text: `Every ${TICKETS_PER_ENTRY} tickets = 1 draw entry + unique code` },
              { icon: Star, color: "#ec4899", text: `${WINNERS_COUNT} entries are randomly selected every week` },
              { icon: Gift, color: "#f59e0b", text: `Each winner gets a Rp${PRIZE_PER_WINNER.toLocaleString("id-ID")} Indomaret voucher` },
              { icon: Zap, color: "#3b82f6", text: "More entries = more chances to win" },
            ].map(({ icon: Icon, color, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                  <Icon size={11} style={{ color }} />
                </div>
                <p className="text-xs text-white/50 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      <LegalFooter />
      <BottomNav />
    </div>
  );
}
