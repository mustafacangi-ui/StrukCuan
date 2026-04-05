import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Award, X, Gift, Zap, Trophy } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useMyDrawEntries, useEnsureDrawEntries } from "@/hooks/useWeeklyDraw";
import { useLotteryWinners } from "@/hooks/useLotteryWinners";
import { getCountdownParts, pad } from "@/lib/weeklyCountdown";

export default function WeeklyRewardCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  // Use user_stats.tiket as the single source of truth for cumulative ticket total
  const { data: stats } = useUserStats(user?.id);
  const ticketCount = stats?.tiket ?? 0;
  const { data: winners = [] } = useLotteryWinners(5);
  const { data: myEntries = [] } = useMyDrawEntries();
  const ensureDraw = useEnsureDrawEntries();
  const [showWinners, setShowWinners] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Auto-generate draw codes if user crossed a 10-ticket threshold
  useEffect(() => {
    if (ticketCount > 0 && Math.floor(ticketCount / 10) > myEntries.length) {
      ensureDraw.mutate();
    }
  }, [ticketCount, myEntries.length]);

  // ── Ticket → Entry conversion: tickets never decrease, entries are virtual ──
  // 10 tickets = 1 entry, 27 tickets = 2 entries + 3 until next
  const entries          = Math.floor(ticketCount / 10);
  const remainder        = ticketCount % 10;
  const nextEntryPct     = (remainder / 10) * 100;
  // If remainder is 0 and tickets > 0, they just hit a threshold — show 10 until next
  const ticketsNeeded    = remainder === 0 ? 10 : 10 - remainder;
  const remainingTickets = remainder;

  useEffect(() => {
    const tick = () => setTimeLeft(getCountdownParts());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <>
      <style>{`
        @keyframes gift-aura {
          0%,100% { opacity:.18; transform:scale(1);   }
          50%      { opacity:.38; transform:scale(1.22); }
        }
        @keyframes gift-ring {
          0%   { opacity:.5;  transform:scale(1);   }
          100% { opacity:0;   transform:scale(1.75); }
        }
        @keyframes gift-float {
          0%,100% { transform:translateY(0);    }
          50%     { transform:translateY(-4px); }
        }
        @keyframes wr-shimmer {
          0%   { transform:translateX(-100%); }
          100% { transform:translateX(300%);  }
        }
      `}</style>

      {/* ── Winners Modal ── */}
      {showWinners && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="relative mx-4 w-full max-w-sm rounded-3xl p-6 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(88,28,135,0.85), rgba(17,24,39,0.95))",
              border: "1px solid rgba(168,85,247,0.3)",
              boxShadow: "0 0 60px rgba(168,85,247,0.2), 0 20px 60px rgba(0,0,0,0.5)",
            }}>
            <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-30"
                style={{ background: "radial-gradient(circle, #a855f7, transparent)" }} />
            </div>
            <button onClick={() => setShowWinners(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <X size={14} className="text-white/70" />
            </button>
            <div className="flex items-center gap-2 mb-1 relative z-10">
              <Trophy size={16} className="text-amber-400" />
              <h3 className="font-bold text-base text-white">{t("weeklyReward.winners.title")}</h3>
            </div>
            <p className="text-xs text-purple-300/60 mb-4 relative z-10">{t("weeklyReward.winners.prizeLabel")}</p>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto relative z-10">
              {winners.length === 0 ? (
                <p className="text-xs text-white/50">{t("weeklyReward.winners.empty")}</p>
              ) : (
                winners.map((w, i) => (
                  <div key={w.id}
                    className="flex items-center justify-between rounded-2xl px-3 py-2.5"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full"
                        style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
                        <span className="text-[10px] font-bold text-amber-300">#{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{w.winner_name ?? "—"}</p>
                        <p className="text-[10px] text-white/40">{formatDate(w.draw_date)}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-amber-300">{t("weeklyReward.amount")}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Card ── */}
      <div className="rounded-3xl relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(68,16,107,0.7) 0%, rgba(30,8,60,0.85) 40%, rgba(20,10,50,0.9) 100%)",
          border: "1px solid rgba(168,85,247,0.3)",
          boxShadow: "0 0 40px rgba(168,85,247,0.12), 0 8px 30px rgba(0,0,0,0.4)",
        }}>

        {/* Ambient glow orbs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.25), transparent)" }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-2xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.15), transparent)" }} />

        {/* Shimmer sweep */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          <div className="absolute top-0 bottom-0 w-[40%] opacity-30"
            style={{
              background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)",
              animation: "wr-shimmer 5s ease-in-out infinite",
            }} />
        </div>

        <div className="relative z-10 p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-shrink-0 w-9 h-9">
              <div className="absolute rounded-xl pointer-events-none"
                style={{
                  inset: "-6px",
                  background: "radial-gradient(circle, rgba(168,85,247,0.35) 0%, rgba(236,72,153,0.18) 50%, transparent 75%)",
                  animation: "gift-aura 2.5s ease-in-out infinite",
                }} />
              <div className="absolute rounded-xl pointer-events-none"
                style={{
                  inset: "-2px",
                  border: "1px solid rgba(168,85,247,0.4)",
                  animation: "gift-ring 2.5s ease-out infinite",
                }} />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  background: "rgba(168,85,247,0.15)",
                  border: "1px solid rgba(168,85,247,0.35)",
                  animation: "gift-float 3s ease-in-out infinite",
                }}>
                <Gift size={18} style={{ color: "#a855f7", filter: "drop-shadow(0 0 8px rgba(168,85,247,0.6))" }} />
              </div>
            </div>
            <h2 className="font-bold text-sm text-white/80 uppercase tracking-wider">{t("weeklyReward.cardTitle")}</h2>
          </div>

          {/* Prize headline */}
          <p className="text-xl font-black text-white mb-0.5 leading-tight"
            style={{ textShadow: "0 0 20px rgba(168,85,247,0.4)" }}>
            {t("weeklyReward.headline")}
          </p>
          <p className="text-xs text-pink-300/70 mb-4">{t("weeklyReward.subhead")}</p>

          {/* Prize Pool Box */}
          <div className="rounded-2xl p-3 mb-4"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(168,85,247,0.15)",
            }}>
            <p className="text-[9px] uppercase tracking-widest text-white/30 mb-0.5">{t("weeklyReward.poolLabel")}</p>
            <p className="text-sm font-bold text-purple-300">{t("weeklyReward.poolValue")}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{t("weeklyReward.poolTotal", "Rp250,000 total weekly rewards")}</p>
          </div>

          {/* Ticket → Entry Progress */}
          <div className="rounded-2xl p-4 mb-4"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
            <div className="flex items-center gap-1.5 mb-3">
              <Zap size={10} className="text-purple-400" />
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">{t("weeklyReward.rule")}</p>
            </div>

            {/* Ticket count */}
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[12px] text-white/40">{t("weeklyReward.youHave")}</span>
              <span className="text-xl font-black text-white tabular-nums"
                style={{ textShadow: "0 0 15px rgba(168,85,247,0.5)" }}>
                {ticketCount}
              </span>
              <span className="text-[12px] text-white/40">{t("weeklyReward.ticketsWord")}</span>
            </div>

            {/* Entries */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-sm text-white/30">=</span>
              <span className="text-4xl font-black tabular-nums leading-none"
                style={{ color: "#ffd600", textShadow: "0 0 20px rgba(255,214,0,0.55), 0 0 40px rgba(255,214,0,0.2)" }}>
                {entries}
              </span>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{t("weeklyReward.entriesWord")}</p>
                <p className="text-[10px] text-white/30">{t("weeklyReward.lotteryChances")}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-white/40">
                {remainingTickets === 0
                  ? t("weeklyReward.nextEntryDone")
                  : t("weeklyReward.nextEntryNeedMore", { needed: ticketsNeeded })}
              </span>
              <span className="text-[10px] font-bold tabular-nums text-purple-300">
                {remainingTickets}&thinsp;/&thinsp;10
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${nextEntryPct}%`,
                  background: "linear-gradient(90deg, #a855f7, #ec4899)",
                  boxShadow: "0 0 10px rgba(168,85,247,0.5)",
                }}
              />
            </div>
            {remainingTickets > 0 && (
              <p className="text-[9px] mt-1.5 text-white/25">
                {t("weeklyReward.nextEntryFooter", { needed: ticketsNeeded })}
              </p>
            )}
          </div>

          {/* ── My Draw Codes ── */}
          <div className="mb-4">
            <p className="text-[9px] uppercase tracking-widest text-white/30 mb-2">{t("weeklyReward.myCodesTitle", "My Draw Codes This Week")}</p>
            {myEntries.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {myEntries.map((entry) => (
                  <div key={entry.draw_code} 
                    className="flex justify-between items-center rounded-xl p-2.5"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)"
                    }}>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>#{entry.ticket_threshold}</span>
                    <span className="font-bold tabular-nums tracking-widest text-white text-xs">
                      {entry.draw_code}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl p-3 text-center border border-dashed"
                style={{
                  borderColor: "rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.2)"
                }}>
                <p className="text-[10px] text-white/30">{t("weeklyReward.myCodesEmpty", "Keep collecting tickets to unlock your first draw code!")}</p>
              </div>
            )}
          </div>

          {/* Countdown */}
          <div className="mb-4">
            <p className="text-[9px] uppercase tracking-widest text-white/30 mb-2">{t("weeklyReward.countdownLabel")}</p>
            <div className="flex gap-2">
              {[
                { val: pad(timeLeft.days), label: t("time.days") },
                { val: pad(timeLeft.hours), label: t("time.hours") },
                { val: pad(timeLeft.minutes), label: t("time.min") },
                { val: pad(timeLeft.seconds), label: t("time.sec") },
              ].map((block) => (
                <div key={block.label}
                  className="flex flex-1 flex-col items-center justify-center rounded-2xl py-2.5 px-1"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(168,85,247,0.2)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}>
                  <span className="text-lg font-black text-white tabular-nums"
                    style={{ textShadow: "0 0 12px rgba(168,85,247,0.6)" }}>
                    {block.val}
                  </span>
                  <span className="text-[8px] uppercase tracking-widest text-white/30 mt-0.5">{block.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setShowWinners(true)}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-bold text-sm text-white mb-2 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #6d28d9, #db2777)",
              boxShadow: "0 0 20px rgba(168,85,247,0.3)",
            }}>
            <Award size={16} />
            {t("weeklyReward.viewWinners")}
          </button>
          <button
            onClick={() => navigate("/earn")}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 font-bold text-xs"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.5)",
            }}>
            {t("weeklyReward.earnMore")}
          </button>

          <div className="mt-4 pt-3 border-t border-white/5 text-center px-2">
            <p className="text-[8px] leading-tight text-white/30">
              Draws are fully automated. Tickets hold zero cash value. <br />
              Participation implies agreement with our <Link to="/promo-rules" className="underline hover:text-white/60">Promo Rules</Link> & <Link to="/terms" className="underline hover:text-white/60">Terms</Link>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
