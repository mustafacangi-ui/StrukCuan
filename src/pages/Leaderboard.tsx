import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { useLeaderboard } from "@/hooks/useUserStats";
import { useLotteryWinners } from "@/hooks/useLotteryWinners";
import { Trophy, Ticket } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import LegalFooter from "@/components/LegalFooter";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { PREMIUM_PAGE_BACKGROUND } from "@/lib/designTokens";

const RANK_STYLES = [
  {
    bg: "linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(180,83,9,0.12) 100%)",
    border: "1.5px solid rgba(251,191,36,0.55)",
    shadow: "0 0 24px rgba(251,191,36,0.18)",
    badge: { bg: "rgba(251,191,36,0.25)", color: "#fbbf24", border: "1.5px solid rgba(251,191,36,0.7)" },
    nameColor: "#fbbf24",
    label: "🥇",
  },
  {
    bg: "linear-gradient(135deg, rgba(148,163,184,0.14) 0%, rgba(71,85,105,0.10) 100%)",
    border: "1.5px solid rgba(148,163,184,0.40)",
    shadow: "0 0 16px rgba(148,163,184,0.10)",
    badge: { bg: "rgba(148,163,184,0.18)", color: "#cbd5e1", border: "1.5px solid rgba(148,163,184,0.5)" },
    nameColor: "#e2e8f0",
    label: "🥈",
  },
  {
    bg: "linear-gradient(135deg, rgba(180,83,9,0.14) 0%, rgba(120,53,15,0.10) 100%)",
    border: "1.5px solid rgba(217,119,6,0.40)",
    shadow: "0 0 16px rgba(217,119,6,0.10)",
    badge: { bg: "rgba(217,119,6,0.18)", color: "#d97706", border: "1.5px solid rgba(217,119,6,0.5)" },
    nameColor: "#fbbf24",
    label: "🥉",
  },
];

export default function Leaderboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnboarded, isLoading, requireLogin } = useUser();
  const { data: leaderboard = [], isLoading: leaderboardLoading, error } = useLeaderboard(user?.id, 50);
  const { data: winners = [] } = useLotteryWinners(5);

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded) requireLogin("rank");
  }, [isLoading, isOnboarded, requireLogin]);

  const realWinners = winners.filter((w) => w.winner_name && w.winner_name !== "—");

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto relative">
      <div className="fixed inset-0 -z-10" style={{ background: PREMIUM_PAGE_BACKGROUND }} />
      <PageHeader title={t("leaderboard.title")} onBack={() => navigate(-1)} />

      {/* ── DRAW WINNERS ── */}
      {realWinners.length > 0 ? (
        <div className="mt-5 px-4">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={15} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              {t("leaderboard.hallOfFame")}
            </span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(251,191,36,0.4), transparent)" }} />
          </div>

          {/* Winner cards — horizontal scroll */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
            {realWinners.map((w, i) => (
              <div
                key={w.id}
                className="flex-shrink-0 w-44 rounded-2xl p-3.5 relative overflow-hidden"
                style={{
                  background: i === 0
                    ? "linear-gradient(135deg, rgba(251,191,36,0.20) 0%, rgba(180,83,9,0.14) 100%)"
                    : "rgba(255,255,255,0.05)",
                  border: i === 0 ? "1.5px solid rgba(251,191,36,0.55)" : "1px solid rgba(255,255,255,0.10)",
                  boxShadow: i === 0 ? "0 0 24px rgba(251,191,36,0.20)" : "none",
                  animation: `slideInRight 0.35s ease-out ${i * 0.07}s both`,
                }}
              >
                {/* Glow spot (only #1) */}
                {i === 0 && (
                  <div
                    className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(251,191,36,0.35) 0%, transparent 70%)" }}
                  />
                )}
                {/* Rank emoji */}
                <p className="text-lg mb-1.5 leading-none">{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</p>
                {/* Name */}
                <p
                  className="font-display font-bold text-xs truncate mb-1 relative z-10"
                  style={{ color: i === 0 ? "#fbbf24" : "rgba(255,255,255,0.85)" }}
                >
                  {w.winner_name}
                </p>
                {/* Prize */}
                <p className="text-[11px] font-bold text-emerald-400 relative z-10">
                  Rp {(w.prize_amount ?? 100000).toLocaleString("id-ID")}
                </p>
                {w.winning_ballot_id != null && (
                  <p className="text-[9px] font-mono text-amber-200/55 mt-0.5 relative z-10">
                    {t("weeklyDraw.ballotNumber", { id: w.winning_ballot_id })}
                  </p>
                )}
                {/* Date */}
                {w.draw_date && (
                  <p className="text-[9px] text-white/30 mt-1 relative z-10">{w.draw_date}</p>
                )}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="mt-4 mb-2 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>
      ) : (
        /* No winners yet — teaser strip */
        <div
          className="mx-4 mt-5 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.20)" }}
        >
          <Trophy size={18} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-300">{t("leaderboard.hallOfFame")}</p>
            <p className="text-[10px] text-white/40">{t("leaderboard.noWinnersYet")}</p>
          </div>
        </div>
      )}

      {/* ── LEADERBOARD LIST ── */}
      <div className="px-4 mt-4">
        {/* Section label */}
        <div className="flex items-center gap-2 mb-3">
          <Ticket size={13} className="text-white/50" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            {t("leaderboard.subtitle")}
          </span>
        </div>

        {leaderboardLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {t("leaderboard.error")}
          </div>
        )}

        {!leaderboardLoading && !error && leaderboard.length === 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            <EmptyState titleKey="empty.comingSoon" subtitleKey="empty.radarScanning" icon="radar" />
          </div>
        )}

        {!leaderboardLoading && !error && leaderboard.length > 0 && (
          <div className="space-y-2">
            {leaderboard.map((row, i) => {
              const rank = i + 1;
              const isTop3 = rank <= 3;
              const rs = isTop3 ? RANK_STYLES[i] : null;

              return (
                <div
                  key={row.user_id}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 relative overflow-hidden"
                  style={{
                    background: rs ? rs.bg : "rgba(255,255,255,0.04)",
                    border: rs ? rs.border : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: rs ? rs.shadow : "none",
                    animation: `slideInRight 0.3s ease-out ${Math.min(i, 10) * 0.04}s both`,
                  }}
                >
                  {/* Rank badge */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display font-bold text-sm"
                    style={
                      rs
                        ? { background: rs.badge.bg, color: rs.badge.color, border: rs.badge.border }
                        : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.10)" }
                    }
                  >
                    {isTop3 ? rs!.label : rank}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-display font-semibold text-sm truncate"
                      style={{ color: rs ? rs.nameColor : "rgba(255,255,255,0.85)" }}
                    >
                      {row.nickname || t("leaderboard.anonymous")}
                    </p>
                    <p className="text-[10px] text-white/35 mt-0.5">
                      Lv {row.level ?? 1} · {row.total_receipts ?? 0} {t("leaderboard.receipts")}
                    </p>
                  </div>

                  {/* Ticket count */}
                  <div className="text-right shrink-0">
                    <p
                      className="font-display font-bold text-sm tabular-nums"
                      style={
                        rank === 1
                          ? { color: "#fbbf24", textShadow: "0 0 12px rgba(251,191,36,0.6)" }
                          : rank === 2
                          ? { color: "#cbd5e1" }
                          : rank === 3
                          ? { color: "#d97706" }
                          : { color: "rgba(255,255,255,0.6)" }
                      }
                    >
                      {row.tiket ?? 0}
                    </p>
                    <p className="text-[9px] text-white/30 uppercase tracking-wider">{t("common.tickets")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <LegalFooter />
      <BottomNav />
    </div>
  );
}
