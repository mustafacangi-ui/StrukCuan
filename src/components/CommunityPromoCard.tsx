import { MapPin, Check, X } from "lucide-react";
import type { PromoRow } from "@/hooks/usePromos";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useVotePromo } from "@/hooks/usePromos";

interface CommunityPromoCardProps {
  promo: PromoRow & { distance_km: number };
}

function formatDistance(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)} m dari kamu`;
  return `${km.toFixed(1)} km dari kamu`;
}

export default function CommunityPromoCard({ promo }: CommunityPromoCardProps) {
  const { user } = useUser();
  const { data: stats } = useUserStats(user?.id);
  const votePromo = useVotePromo();

  const level = stats?.level ?? user?.level ?? 1;
  const canVotePositive = level >= 2;
  const canVoteNegative = level >= 3;
  const hasVoted = promo.user_vote != null;
  const isVerified = promo.status === "verified" || (promo.positive_votes ?? 0) >= 3;
  const isExpired =
    promo.status === "expired" ||
    (promo.negative_votes ?? 0) >= 3 ||
    (promo.is_expired_by_time ?? false);

  const handleVote = (voteType: "positive" | "negative") => {
    if (!user?.id || hasVoted) return;
    if (voteType === "positive" && !canVotePositive) return;
    if (voteType === "negative" && !canVoteNegative) return;
    votePromo.mutate({ promoId: promo.id, userId: user.id, voteType });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="aspect-[4/3] bg-secondary/50 relative">
        <img
          src={promo.photo_url}
          alt={promo.product_name}
          className="w-full h-full object-cover"
        />
        {isVerified && (
          <div className="absolute top-2 right-2 rounded-full bg-primary/90 px-2 py-0.5 flex items-center gap-1">
            <Check size={12} className="text-primary-foreground" />
            <span className="text-[9px] font-bold text-primary-foreground">✔ Promo Verified</span>
          </div>
        )}
        {isExpired && (
          <div className="absolute top-2 right-2 rounded-lg bg-destructive/90 px-2 py-1 flex items-center gap-1 max-w-[140px]">
            <X size={12} className="text-destructive-foreground flex-shrink-0" />
            <span className="text-[9px] font-bold text-destructive-foreground leading-tight">
              Promo mungkin sudah habis.
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="font-display text-sm font-bold text-foreground">{promo.store_name}</p>
        <p className="text-xs text-foreground mt-0.5">{promo.product_name}</p>
        <p className="inline-block mt-1 rounded-md bg-primary px-2 py-0.5 font-display text-xs font-bold text-primary-foreground">
          Diskon {promo.discount}%
        </p>
        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
          <MapPin size={10} />
          <span>{formatDistance(promo.distance_km)}</span>
        </div>

        <p className="mt-2 text-[10px] text-muted-foreground">
          Promo oleh Level {promo.author_level ?? 1} User
        </p>

        {!isVerified && !isExpired && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => handleVote("positive")}
                disabled={hasVoted || !canVotePositive}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                  hasVoted
                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                    : canVotePositive
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
                }`}
              >
                <Check size={14} />
                <span>✔ Masih Ada</span>
              </button>
              <button
                onClick={() => handleVote("negative")}
                disabled={hasVoted || !canVoteNegative}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors ${
                  hasVoted
                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                    : canVoteNegative
                      ? "bg-destructive text-destructive-foreground hover:opacity-90"
                      : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
                }`}
              >
                <X size={14} />
                <span>✖ Sudah Habis</span>
              </button>
            </div>
            <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
              <span>✔ Masih Ada ({promo.positive_votes ?? 0})</span>
              <span>✖ Sudah Habis ({promo.negative_votes ?? 0})</span>
            </div>
            {(promo.negative_votes ?? 0) > (promo.positive_votes ?? 0) && (
              <p className="text-[10px] font-semibold text-destructive text-center">
                Promo kemungkinan sudah habis
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
