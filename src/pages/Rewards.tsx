import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Gift, Coins, Copy, Check } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useRewards, useRedeemReward, type RewardRow } from "@/hooks/useRewards";
import { formatCurrency } from "@/config/locale";
import { PageHeader } from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Rewards() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isOnboarded, isLoading: authLoading } = useUser();
  const { data: stats } = useUserStats(user?.id);
  const countryCode = user?.countryCode ?? "ID";
  const { data: rewards = [], isLoading } = useRewards(countryCode);
  const redeem = useRedeemReward();

  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !isOnboarded) {
      navigate("/", { replace: true, state: { requireLogin: "profile" as const } });
    }
  }, [authLoading, isOnboarded, navigate]);

  const cuan = stats?.cuan ?? 0;

  const handleBuy = async (reward: RewardRow) => {
    if (!user?.id) {
      toast.error(t("auth.mustLogin"));
      return;
    }
    if (cuan < reward.cuan_cost) {
      toast.error("Yetersiz Cuan");
      return;
    }
    try {
      const result = await redeem.mutateAsync(reward.id);
      if (result.success && result.code) {
        setClaimedCode(result.code);
        setShowCodeModal(true);
        toast.success("Ödül alındı!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "INSUFFICIENT_CUAN") toast.error("Yetersiz Cuan");
      else if (msg === "NO_CODES_AVAILABLE") toast.error("Şu an stokta yok");
      else if (msg === "COUNTRY_MISMATCH") toast.error("Bu ödül ülkenizde mevcut değil");
      else toast.error("Bir hata oluştu");
    }
  };

  const handleCopyCode = () => {
    if (!claimedCode) return;
    navigator.clipboard.writeText(claimedCode);
    setCopied(true);
    toast.success("Kod kopyalandı");
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setShowCodeModal(false);
    setClaimedCode(null);
  };

  if (!isOnboarded && !authLoading) return null;

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto relative overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#ff6ec4] via-[#c94fd6] to-[#8e2de2]" />
      <PageHeader title={t("rewards.title", "Ödüller")} onBack={() => navigate(-1)} />

      <div className="px-4 mt-4">
        {/* Cuan bakiyesi */}
        <div
          className="rounded-2xl p-4 mb-4 flex items-center justify-between"
          style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <div className="flex items-center gap-2">
            <Coins size={24} className="text-amber-500" />
            <span className="text-sm text-white/80">Bakiye</span>
          </div>
          <span className="font-display font-bold text-amber-400">
            {formatCurrency(cuan, countryCode)}
          </span>
        </div>

        {/* Ödül kartları */}
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/70 mb-3">
          {countryCode === "DE"
            ? "Amazon.de & Lidl Hediye Çekleri"
            : countryCode === "ID"
              ? "Alfamart Hediye Çekleri"
              : "Ödüller"}
        </h2>

        {isLoading ? (
          <p className="text-sm text-white/70 py-8 text-center">Yükleniyor...</p>
        ) : rewards.length === 0 ? (
          <p className="text-sm text-white/70 py-8 text-center">
            Bu ülke için henüz ödül yok.
          </p>
        ) : (
          <div className="space-y-3">
            {rewards.map((reward) => {
              const canAfford = cuan >= reward.cuan_cost;
              return (
                <div
                  key={reward.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(0,0,0,0.45)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                      <Gift size={24} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-white">{reward.name}</p>
                      <p className="text-xs text-white/70 mt-0.5">{reward.provider}</p>
                      <p className="text-sm font-bold text-amber-400 mt-2">
                        {formatCurrency(reward.voucher_amount, countryCode)}
                      </p>
                      <p className="text-[10px] text-white/60 mt-1">
                        {reward.cuan_cost} Cuan
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBuy(reward)}
                      disabled={!canAfford || redeem.isPending}
                      className="shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: canAfford ? "#facc15" : "rgba(255,255,255,0.2)",
                        color: canAfford ? "#000" : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {redeem.isPending ? "..." : t("rewards.buy", "Satın Al")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Kod gösterim modal */}
      <Dialog open={showCodeModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent
          className="max-w-[340px] rounded-2xl"
          style={{
            background: "rgba(0,0,0,0.9)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Gift size={20} className="text-primary" />
              {t("rewards.codeTitle", "Dijital Kodunuz")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-white/80">
              {t("rewards.codeDesc", "Aşağıdaki kodu kopyalayıp ilgili sitede kullanın.")}
            </p>
            <div
              className="rounded-xl p-4 font-mono text-lg font-bold text-center tracking-widest bg-white/10 border border-white/20"
            >
              {claimedCode}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold bg-primary text-primary-foreground"
            >
              {copied ? (
                <>
                  <Check size={18} />
                  Kopyalandı
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Kodu Kopyala
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
