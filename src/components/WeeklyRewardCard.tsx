import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Award, X, Gift } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useUserTickets } from "@/hooks/useUserTickets";
import { useLotteryWinners } from "@/hooks/useLotteryWinners";
import { getCountdownParts, pad } from "@/lib/weeklyCountdown";

export default function WeeklyRewardCard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { data: ticketCount = 0 } = useUserTickets(user?.id);
  const { data: winners = [] } = useLotteryWinners(5);
  const [showWinners, setShowWinners] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // ── Ticket → Entry conversion (10 tickets = 1 entry) ──
  const entries          = Math.floor(ticketCount / 10);
  const remainingTickets = ticketCount % 10;
  const nextEntryPct     = (remainingTickets / 10) * 100;
  const ticketsNeeded    = 10 - remainingTickets;

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
      {showWinners && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-md animate-fade-in">
          <div className="relative mx-4 w-full max-w-sm rounded-2xl p-6 bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl ring-1 ring-white/10">
            <button onClick={() => setShowWinners(false)} className="absolute top-3 right-3 text-white/80 hover:text-white">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-1">
              <Award size={16} className="text-[#00FF88]" />
              <h3 className="font-display text-base font-bold text-white">Prize Winners</h3>
            </div>
            <p className="text-xs text-white/80 mb-4">Rp100,000 Shopping Voucher</p>
            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
              {winners.length === 0 ? (
                <p className="text-xs text-white/80">No winners yet</p>
              ) : (
                winners.map((w, i) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-xl bg-black/40 border border-white/20 px-3 py-2.5 backdrop-blur-lg shadow-2xl ring-1 ring-white/10"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#00FF88]/20">
                        <span className="text-[10px] font-bold text-[#00FF88]">#{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{w.nickname}</p>
                        <p className="text-[10px] text-white/80">{formatDate(w.draw_date)}</p>
                      </div>
                    </div>
                    <span className="font-display text-[11px] font-bold text-[#00FF88]">Rp100,000</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-4 rounded-2xl p-6 bg-black/40 backdrop-blur-lg border border-white/20 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/20">
            <Gift size={18} className="text-[#00FF88]" />
          </div>
          <h2 className="font-display text-sm font-bold text-white">Weekly Reward</h2>
        </div>

        <p className="font-display text-lg font-bold text-white">Win a Rp100,000 Shopping Voucher</p>
        <p className="text-xs text-white/80 mt-0.5">5 winners every week</p>

        <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/20 backdrop-blur-lg shadow-2xl ring-1 ring-white/10">
          <p className="text-[10px] text-white/80">Weekly Prize Pool</p>
          <p className="font-display text-sm font-bold text-[#00FF88]">5 × Rp100,000 vouchers</p>
        </div>

        {/* ── Ticket → Entry system ────────────────────────────── */}
        <div
          className="mt-4 rounded-xl p-4 relative overflow-hidden"
          style={{
            background: "rgba(0,0,0,0.28)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Rule — subtle helper text */}
          <p
            className="text-[10px] mb-3 font-medium"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            Each 10 tickets = 1 entry in the weekly draw
          </p>

          {/* Ticket count */}
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="font-display text-[12px] text-white/55">You have</span>
            <span className="font-display text-[20px] font-extrabold text-white tabular-nums">
              {ticketCount}
            </span>
            <span className="font-display text-[12px] text-white/55">tickets</span>
          </div>

          {/* Entries — the number that matters */}
          <div className="flex items-center gap-2.5 mb-4">
            <span className="text-[13px] text-white/30">=</span>
            <span
              className="font-display text-[32px] font-extrabold leading-none tabular-nums"
              style={{
                color: "#ffd600",
                textShadow: "0 0 20px rgba(255,214,0,0.55), 0 0 40px rgba(255,214,0,0.2)",
              }}
            >
              {entries}
            </span>
            <div>
              <p className="font-display text-[14px] font-bold text-white leading-tight">
                entries
              </p>
              <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.42)" }}>
                lottery chances
              </p>
            </div>
          </div>

          {/* Progress to next entry */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                {remainingTickets === 0
                  ? "Entry threshold reached!"
                  : `${ticketsNeeded} more ticket${ticketsNeeded !== 1 ? "s" : ""} for next entry`}
              </span>
              <span
                className="text-[11px] font-bold tabular-nums"
                style={{ color: "#00E676" }}
              >
                {remainingTickets}&thinsp;/&thinsp;10
              </span>
            </div>

            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${nextEntryPct}%`,
                  background: "linear-gradient(90deg,#00E676,#00c853)",
                  boxShadow: "0 0 8px rgba(0,230,118,0.5)",
                }}
              />
            </div>

            {remainingTickets > 0 && (
              <p
                className="text-[9px] mt-1.5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Earn {ticketsNeeded} more ticket{ticketsNeeded !== 1 ? "s" : ""} to unlock 1 more entry
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[10px] text-white/80 mb-2">Next draw in</p>
          <div className="flex gap-3 items-stretch">
            {[
              { val: pad(timeLeft.days), label: "Days" },
              { val: pad(timeLeft.hours), label: "Hours" },
              { val: pad(timeLeft.minutes), label: "Min" },
              { val: pad(timeLeft.seconds), label: "Sec" },
            ].map((block) => (
              <div key={block.label} className="flex flex-1 flex-col items-center justify-center rounded-xl bg-black/40 border border-white/20 py-3 px-2 min-w-0 backdrop-blur-lg shadow-2xl ring-1 ring-white/10">
                <span className="font-display text-base font-bold text-white tabular-nums leading-tight">{block.val}</span>
                <span className="text-[9px] text-white/80 uppercase mt-1">{block.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowWinners(true)}
          className="mt-4 w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 py-3.5 min-h-[48px] font-display font-bold text-sm text-white transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
        >
          <Award size={16} />
          View Winners
        </button>
        <button
          onClick={() => navigate("/earn")}
          className="mt-2 w-full flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-black/40 py-2.5 font-display font-bold text-xs text-white transition-all hover:bg-black/50 backdrop-blur-lg shadow-2xl ring-1 ring-white/10"
        >
          Earn More Tickets
        </button>
      </div>
    </>
  );
}
