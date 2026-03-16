import { Play, Ticket } from "lucide-react";

interface WatchEarnCardProps {
  /** Ad range label e.g. "1-5" */
  adRange: string;
  /** Ticket reward e.g. 1, 2, 3 */
  reward: number;
  /** Whether this tier is completed (user has watched enough ads) */
  isCompleted?: boolean;
  /** Disable button (e.g. weekly limit reached) */
  disabled?: boolean;
  /** Called when user clicks Watch Ad */
  onWatchAd?: () => void;
  /** Whether ad modal is open / watching */
  isWatching?: boolean;
}

export default function WatchEarnCard({
  adRange,
  reward,
  isCompleted = false,
  disabled = false,
  onWatchAd,
  isWatching = false,
}: WatchEarnCardProps) {
  const isDisabled = disabled || isWatching;

  return (
    <div className="rounded-xl border border-white/20 bg-white/95 backdrop-blur-sm p-4 shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-bold text-gray-900">
            Watch {adRange} Ads
          </h3>
          <p className="flex items-center gap-1 mt-1 text-xs text-gray-600">
            <Ticket size={14} className="text-green-500 flex-shrink-0" />
            <span>+{reward} Ticket{reward !== 1 ? "s" : ""}</span>
          </p>
          {isCompleted && (
            <p className="mt-1 text-[10px] font-medium text-green-600">Completed</p>
          )}
        </div>
        <button
          type="button"
          onClick={onWatchAd}
          disabled={isDisabled}
          className="shrink-0 flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-500"
        >
          <Play size={14} fill="currentColor" />
          {isWatching ? "Watching..." : "Watch Ad"}
        </button>
      </div>
    </div>
  );
}
