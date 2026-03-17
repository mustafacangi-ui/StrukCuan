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
import { EmptyState } from "@/components/EmptyState";
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
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-[#db2777] via-[#c026d3] to-[#7c3aed]" />
      <PageHeader title={t("rewards.title", "Ödüller")} onBack={() => navigate(-1)} />

      <div className="px-4 mt-4">
        {/* Cuan bakiyesi - premium white glass */}
        <div className="rounded-2xl p-4 mb-4 flex items-center justify-between bg-white/90 backdrop-blur-xl border border-white/40 shadow-lg">
          <div className="flex items-center gap-2">
            <Coins size={24} className="text-emerald-600" />
            <span className="text-sm font-medium text-slate-700">Bakiye</span>
          </div>
          <span className="font-display font-bold text-slate-900">
            {formatCurrency(cuan, countryCode)}
          </span>
        </div>

        {/* Ödül kartları */}
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/90 mb-3">
          {countryCode === "DE"
            ? "Amazon.de & Lidl Hediye Çekleri"
            : countryCode === "ID"
              ? "Alfamart Hediye Çekleri"
              : "Ödüller"}
        </h2>

        {isLoading ? (
          <p className="text-sm text-white/70 py-8 text-center">Yükleniyor...</p>
        ) : rewards.length === 0 ? (
          <div className="rounded-2xl overflow-hidden bg-white/90 backdrop-blur-xl border border-white/40 shadow-lg">
            <EmptyState
              titleKey="empty.comingSoon"
              subtitleKey="empty.radarScanning"
              icon="radar"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((reward) => {
              const canAfford = cuan >= reward.cuan_cost;
              return (
                <div key={reward.id} className="rounded-2xl p-4 bg-white/90 backdrop-blur-xl border border-white/40 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                      <Gift size={24} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-slate-900">{reward.name}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{reward.provider}</p>
                      <p className="text-sm font-bold text-emerald-600 mt-2">
                        {formatCurrency(reward.voucher_amount, countryCode)}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        {reward.cuan_cost} Cuan
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBuy(reward)}
                      disabled={!canAfford || redeem.isPending}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        canAfford
                          ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40"
                          : "bg-white/50 text-slate-500 border border-white/60"
                      }`}
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
          className="max-w-[340px] rounded-2xl bg-white/95 backdrop-blur-xl border border-white/40 shadow-xl"
        >
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              <Gift size={20} className="text-emerald-600" />
              {t("rewards.codeTitle", "Dijital Kodunuz")}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">
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
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30"
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
