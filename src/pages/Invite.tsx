import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, MessageCircle, UserPlus } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import { useReferralCode, useReferralCount, WHATSAPP_MESSAGE } from "@/hooks/useReferrals";
import { toast } from "sonner";

const BASE_URL = "https://struk-cuan.vercel.app";

export default function Invite() {
  const navigate = useNavigate();
  const { user, isOnboarded, isLoading } = useUser();
  const { data: referralCode, isLoading: codeLoading } = useReferralCode(user?.id);
  const { data: friendsJoined = 0 } = useReferralCount(user?.id);

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [isLoading, isOnboarded, navigate]);

  const inviteLink = referralCode ? `${BASE_URL}?r=${referralCode}` : "";

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Link berhasil disalin!");
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  const handleWhatsAppShare = () => {
    if (!referralCode) return;
    const text = encodeURIComponent(WHATSAPP_MESSAGE(referralCode));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (!isOnboarded) return null;

  return (
    <div className="min-h-screen bg-background pb-28 max-w-[420px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button onClick={() => navigate("/")} className="rounded-full bg-secondary p-2">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Invite</h1>
      </div>

      <div className="px-4 mt-6">
        {/* Title & Subtitle */}
        <div className="text-center mb-6">
          <h2 className="font-display text-xl font-bold text-foreground">
            Invite Friends & Earn Tickets
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Invite your friends to StrukCuan and earn tickets together.
          </p>
        </div>

        {/* Invite Link Section */}
        <div className="rounded-xl border border-primary/30 bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
            Link undangan kamu
          </p>
          {codeLoading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <>
              <div className="rounded-lg bg-secondary/50 p-3 font-mono text-xs text-foreground break-all">
                {inviteLink || "-"}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCopyLink}
                  disabled={!inviteLink}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-3 font-display font-bold text-sm text-primary-foreground disabled:opacity-50"
                >
                  <Copy size={16} />
                  Copy Link
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  disabled={!referralCode}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3 font-display font-bold text-sm text-white disabled:opacity-50"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
              </div>
            </>
          )}
        </div>

        {/* Friends Joined Progress */}
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary glow-green">
              <UserPlus size={24} className="text-primary" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-foreground">
                Friends joined: {friendsJoined}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Teman yang sudah daftar & upload struk pertama
              </p>
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="mt-6 rounded-xl border border-border bg-card/50 p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bagikan link undangan ke teman. Saat teman daftar dan upload struk pertamanya, kamu dan teman masing-masing dapat +1 tiket!
          </p>
        </div>
      </div>

      <LegalFooter />
      <BottomNav />
    </div>
  );
}
