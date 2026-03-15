import { Ticket, Play, Star, ChevronRight } from "lucide-react";
import type { TodayTicket } from "@/hooks/useTodayRewardedTickets";
import { getNextTicketAt, ticketsFromAds, MAX_ADS_PER_DAY } from "@/hooks/useTodayRewardedTickets";

export type PromoState =
  | "start"
  | "progress"
  | "ticket_earned"
  | "progress_5_10"
  | "daily_limit"
  | "bonus_modal"
  | "bonus_unlocked"
  | "final_limit"
  | "wallet"
  | "weekly_draw";

interface PromoCardProps {
  state: PromoState;
  adsWatched: number;
  /** Tickets this week from user_tickets.tickets (source of truth for draw) */
  ticketsThisWeek: number;
  /** Today's ad events for display (e.g. wallet list) */
  tickets: TodayTicket[];
  maxAds: number;
  bonusUnlocked?: boolean;
  latestTicketNumber?: string | null;
  onContinueEarning: () => void;
  onUnlockBonus?: () => void;
  onKeepWatching?: () => void;
  onViewWallet?: () => void;
  onViewWeeklyDraw?: () => void;
  onBack?: () => void;
  isWatching?: boolean;
}

export default function PromoCard({
  state,
  adsWatched,
  ticketsThisWeek,
  tickets,
  maxAds,
  bonusUnlocked = false,
  latestTicketNumber,
  onContinueEarning,
  onUnlockBonus,
  onKeepWatching,
  onViewWallet,
  onViewWeeklyDraw,
  onBack,
  isWatching = false,
}: PromoCardProps) {
  const nextTicket = getNextTicketAt(adsWatched ?? 0);
  const progressTarget = nextTicket ?? MAX_ADS_PER_DAY;
  const filledSegments = Math.min(adsWatched ?? 0, progressTarget);
  const totalSegments = progressTarget;
  const nextTicketLabel = nextTicket != null ? `NEXT TICKET AT ${nextTicket} ADS` : "All Done for Today";
  const gradientBtn =
    "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-display font-bold text-sm bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

  const cardBase =
    "relative overflow-hidden rounded-2xl border-2 border-pink-500/50 bg-black/40 backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(236,72,153,0.15)]";

  const ticketBadge =
    "inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-2.5 py-0.5 text-xs font-bold text-amber-300";

  return (
    <div className={cardBase}>
      {/* Glow overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/5 via-transparent to-purple-600/5" />

      <div className="relative z-10">
        {/* Header: ticket counter - from user_tickets.tickets only */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎟</span>
            <h2 className="font-display text-lg font-bold text-white">
              {ticketsThisWeek} Ticket{ticketsThisWeek !== 1 ? "s" : ""}
            </h2>
          </div>
          <span className={ticketBadge}>Free Tickets</span>
        </div>

        {/* State-specific content */}
        {(state === "start" || state === "progress" || state === "progress_5_10") && (
          <>
            <p className="mb-4 text-sm text-white/80">
              Watch short ads to earn tickets for the weekly draw.
            </p>
            <div className="mb-4">
              <div className="mb-2 flex justify-between text-xs text-white/70">
                <span>ADS WATCHED {adsWatched}/{progressTarget}</span>
                <span>
                  {nextTicketLabel}
                </span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: totalSegments }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-full transition-all duration-500 ease-out"
                    style={{
                      background:
                        i < filledSegments
                          ? "linear-gradient(90deg, #ec4899, #a855f7)"
                          : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={onContinueEarning}
              disabled={isWatching}
              className={gradientBtn}
            >
              <Play size={18} fill="currentColor" />
              Continue Earning
            </button>
          </>
        )}

        {state === "ticket_earned" && (
          <div className="animate-in fade-in duration-300">
            <div className="mb-4 flex flex-col items-center gap-3">
              <div className="relative animate-ticket-pop">
                <Ticket className="h-16 w-16 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
                <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Ticket Earned!</h3>
              {latestTicketNumber && (
                <div className="rounded-lg bg-white/10 px-4 py-2 font-mono text-sm text-amber-300">
                  {latestTicketNumber}
                </div>
              )}
            </div>
            <button type="button" onClick={onContinueEarning} className={gradientBtn}>
              <Play size={18} fill="currentColor" />
              Continue Earning
            </button>
          </div>
        )}

        {state === "daily_limit" && (
          <>
            <h3 className="mb-2 font-display text-lg font-bold text-white">
              Daily Limit Reached
            </h3>
            <p className="mb-2 text-sm text-white/80">
              You earned 2 tickets! (10 ads watched)
            </p>
            <p className="mb-4 text-sm text-white/80">
              Watch 3 more ads to unlock bonus and earn 1 more ticket.
            </p>
            <p className="mb-2 text-sm font-semibold text-white/90">
              Bonus unlock (3 ads):
            </p>
            <ul className="mb-4 space-y-2 text-sm text-white/90">
              <li className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                +5 extra ads (14–18)
              </li>
              <li className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-400" />
                +1 ticket at 18 ads
              </li>
            </ul>
            <button
              type="button"
              onClick={onUnlockBonus}
              className={gradientBtn}
            >
              <Star size={18} />
              Unlock Bonus Challenge
            </button>
          </>
        )}

        {state === "bonus_modal" && (
          <>
            <h3 className="mb-2 font-display text-lg font-bold text-white">
              Unlock Bonus
            </h3>
            <p className="mb-2 text-sm text-white/80">
              ADS WATCHED {adsWatched}/{progressTarget}
            </p>
            <p className="mb-4 text-sm text-white/80">
              Watch 5 more ads to earn your next ticket.
            </p>
            <button
              type="button"
              onClick={onContinueEarning}
              disabled={isWatching}
              className={gradientBtn}
            >
              <Play size={18} fill="currentColor" />
              Continue Earning
            </button>
          </>
        )}

        {state === "bonus_unlocked" && (
          <>
            <h3 className="mb-2 font-display text-lg font-bold text-white">
              Bonus Unlocked!
            </h3>
            <p className="mb-4 text-sm text-white/80">
              Watch 5 more ads (11–15) to earn your 3rd ticket.
            </p>
            <div className="mb-4">
              <div className="mb-2 flex justify-between text-xs text-white/70">
                <span>ADS WATCHED {adsWatched}/{progressTarget}</span>
                <span>{nextTicketLabel}</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: totalSegments }).map((_, i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-full transition-all duration-500 ease-out"
                    style={{
                      background:
                        i < filledSegments
                          ? "linear-gradient(90deg, #ec4899, #a855f7)"
                          : "rgba(255,255,255,0.1)",
                    }}
                  />
                ))}
              </div>
            </div>
            <button type="button" onClick={onKeepWatching} disabled={isWatching} className={gradientBtn}>
              <Play size={18} fill="currentColor" />
              Keep Watching
            </button>
          </>
        )}

        {state === "final_limit" && (
          <>
            <h3 className="mb-2 font-display text-lg font-bold text-white">
              All Done for Today
            </h3>
            <p className="mb-4 text-sm text-white/80">
              Come back tomorrow for more chances to earn tickets.
            </p>
            <div className="flex gap-2">
              {onViewWallet && (
                <button
                  type="button"
                  onClick={onViewWallet}
                  className="flex-1 rounded-xl border border-pink-500/50 bg-pink-500/10 py-2.5 font-display text-sm font-bold text-white"
                >
                  My Tickets
                </button>
              )}
              {onViewWeeklyDraw && (
                <button
                  type="button"
                  onClick={onViewWeeklyDraw}
                  className="flex-1 rounded-xl border border-purple-500/50 bg-purple-500/10 py-2.5 font-display text-sm font-bold text-white"
                >
                  Weekly Draw
                </button>
              )}
            </div>
          </>
        )}

        {state === "wallet" && (
          <>
            <h3 className="mb-4 font-display text-lg font-bold text-white">
              My Tickets
            </h3>
            <div className="mb-4 space-y-3">
              <div className="rounded-lg bg-white/5 px-4 py-3">
                <p className="text-xs text-white/60 mb-1">Tickets this week (for draw)</p>
                <p className="font-display text-2xl font-bold text-amber-300">
                  {ticketsThisWeek} Ticket{ticketsThisWeek !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="rounded-lg bg-white/5 px-4 py-2">
                <p className="text-xs text-white/60">Ads watched today: {adsWatched} · Tickets from ads: {ticketsFromAds(adsWatched)}</p>
              </div>
            </div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full rounded-xl border border-white/20 py-2 text-sm text-white/80"
              >
                <ChevronRight className="inline h-4 w-4 rotate-180" /> Back
              </button>
            )}
          </>
        )}

        {state === "weekly_draw" && (
          <>
            <h3 className="mb-4 font-display text-lg font-bold text-white">
              Weekly Draw
            </h3>
            <div className="mb-4 flex aspect-square max-w-[200px] mx-auto items-center justify-center rounded-full border-4 border-pink-500/50 bg-gradient-to-br from-pink-500/20 to-purple-600/20">
              <div className="flex flex-col items-center gap-1">
                <Ticket className="h-12 w-12 text-amber-400" />
                <span className="text-xs text-white/70">Raffle wheel</span>
              </div>
            </div>
            <p className="mb-4 text-center text-sm text-white/80">
              Your tickets are entered into the weekly draw. Good luck!
            </p>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full rounded-xl border border-white/20 py-2 text-sm text-white/80"
              >
                <ChevronRight className="inline h-4 w-4 rotate-180" /> Back
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
