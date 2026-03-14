import { Ticket, Play, Star, ChevronRight } from "lucide-react";
import type { TodayTicket } from "@/hooks/useTodayRewardedTickets";

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
  ticketsToday: number;
  tickets: TodayTicket[];
  maxAds: number;
  bonusProgress?: number;
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

const SEGMENTS = 10;

export default function PromoCard({
  state,
  adsWatched,
  ticketsToday,
  tickets,
  maxAds,
  bonusProgress = 0,
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
  const filledSegments = Math.min(adsWatched, SEGMENTS);
  const totalSegments = SEGMENTS;
  const nextTicketAds = adsWatched < 10 ? adsWatched + 1 : null;

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
        {/* Header: ticket counter - 🎟 X Tickets */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎟</span>
            <h2 className="font-display text-lg font-bold text-white">
              {ticketsToday} Ticket{ticketsToday !== 1 ? "s" : ""}
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
                <span>ADS WATCHED {adsWatched}/{totalSegments}</span>
                <span>
                  {nextTicketAds ? `NEXT TICKET at ${nextTicketAds} ads` : "Daily limit"}
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

        {(state === "daily_limit" || state === "bonus_modal") && (
          <>
            <h3 className="mb-2 font-display text-lg font-bold text-white">
              Daily Limit Reached
            </h3>
            <p className="mb-2 text-sm text-white/80">
              Daily limit reached (10 ads watched)
            </p>
            <p className="mb-4 text-sm text-white/80">
              But you can unlock bonus ads.
            </p>
            <p className="mb-2 text-sm font-semibold text-white/90">
              Watch 3 ads to unlock:
            </p>
            <ul className="mb-4 space-y-2 text-sm text-white/90">
              <li className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                +5 extra ads
              </li>
              <li className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-400" />
                +1 ticket
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

        {state === "bonus_unlocked" && (
          <>
            <h3 className="mb-2 font-display text-lg font-bold text-white">
              Bonus Unlocked
            </h3>
            <ul className="mb-4 space-y-2 text-sm text-white/90">
              <li className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                +5 extra ads
              </li>
              <li className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-amber-400" />
                +1 ticket
              </li>
            </ul>
            <button type="button" onClick={onKeepWatching} className={gradientBtn}>
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
            <ul className="mb-4 space-y-2">
              {tickets.length > 0 ? (
                tickets.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2"
                  >
                    <Ticket className="h-5 w-5 text-amber-400 shrink-0" />
                    <span className="font-mono text-sm text-white">
                      {t.ticket_number ?? `#${t.id}`}
                    </span>
                  </li>
                ))
              ) : (
                <p className="text-sm text-white/60">No tickets yet today.</p>
              )}
            </ul>
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
