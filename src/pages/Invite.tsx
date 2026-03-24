import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Copy, MessageCircle, Send, Share2, Camera, Instagram, UserPlus } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import BottomNav from "@/components/BottomNav";
import LegalFooter from "@/components/LegalFooter";
import { useReferralCode, useReferralCount, WHATSAPP_MESSAGE } from "@/hooks/useReferrals";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { APP_URL } from "@/config/app";
import { PREMIUM_PAGE_BACKGROUND } from "@/lib/designTokens";

export default function Invite() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isOnboarded, isLoading, requireLogin } = useUser();
  const { data: referralCode, isLoading: codeLoading, ensureReferralCode, fallbackCode } = useReferralCode(user?.id);
  const { data: friendsJoined = 0 } = useReferralCount(user?.id);

  const [ensured, setEnsured] = React.useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded) requireLogin("invite");
  }, [isLoading, isOnboarded, requireLogin]);

  // Ensure referral_code exists when we have user but no code from DB
  useEffect(() => {
    if (!user?.id || ensured) return;
    if (!codeLoading && !referralCode) {
      setEnsured(true);
      ensureReferralCode().catch(() => {});
    }
  }, [user?.id, codeLoading, referralCode, ensured, ensureReferralCode]);

  const effectiveCode = referralCode || fallbackCode;
  const referralUrl = effectiveCode ? `${APP_URL}?r=${effectiveCode}` : "";

  const inviteMessage = t("invite.shareMessage", { code: effectiveCode ?? "" });

  const handleCopyLink = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success(t("invite.linkCopied"));
    } catch {
      toast.error(t("invite.failedCopy"));
    }
  };

  const handleWhatsAppShare = () => {
    if (!referralUrl) return;
    const text = encodeURIComponent(WHATSAPP_MESSAGE(referralUrl, effectiveCode ?? undefined));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleTelegramShare = () => {
    if (!referralUrl) return;
    const text = encodeURIComponent(inviteMessage);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${text}`, "_blank");
  };

  const handleFacebookShare = () => {
    if (!referralUrl) return;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`, "_blank");
  };

  const handleTikTokShare = async () => {
    if (!referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "StrukCuan", text: inviteMessage, url: referralUrl });
        toast.success(t("invite.shared"));
      } catch {
        try {
          await navigator.clipboard.writeText(referralUrl);
          toast.success(t("invite.linkCopied"));
        } catch {
          toast.error(t("invite.failedCopy"));
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(referralUrl);
        toast.success(t("invite.linkCopied"));
      } catch {
        toast.error(t("invite.failedCopy"));
      }
    }
  };

  const handleInstagramShare = async () => {
    if (!referralUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "StrukCuan", text: inviteMessage, url: referralUrl });
        toast.success(t("invite.shared"));
      } catch {
        try {
          await navigator.clipboard.writeText(referralUrl);
          toast.success(t("invite.linkCopied"));
        } catch {
          toast.error(t("invite.failedCopy"));
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(referralUrl);
        toast.success(t("invite.linkCopied"));
      } catch {
        toast.error(t("invite.failedCopy"));
      }
    }
  };

  return (
    <div className="min-h-screen pb-28 max-w-[420px] mx-auto relative">
      {/* Premium dark navy/purple background — matches Home screen gold standard */}
      <div
        className="fixed inset-0 -z-10"
        style={{ background: PREMIUM_PAGE_BACKGROUND }}
      />
      <PageHeader title={t("invite.title")} onBack={() => navigate(-1)} />

      <div className="px-4 mt-6">
        {/* Title & Subtitle */}
        <div className="text-center mb-6">
          <h2 className="font-display text-xl font-bold text-white">
            {t("invite.pageTitle")}
          </h2>
          <p className="mt-2 text-sm text-white/68">
            {t("invite.subtitle")}
          </p>
        </div>

        {/* Invite Link Section */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p className="text-[10px] uppercase tracking-wider text-white/70 mb-2 font-semibold">
            {t("invite.yourInviteLink")}
          </p>
          {codeLoading && !referralUrl ? (
            <div className="space-y-3">
              <div className="h-4 w-3/4 rounded bg-white/20 animate-pulse" />
              <div className="h-10 w-full rounded-xl bg-white/10 animate-pulse" />
            </div>
          ) : (
            <>
              <div
                className="rounded-2xl p-4 mb-4"
                style={{ background: "rgba(0,0,0,0.4)" }}
              >
                <p className="text-sm text-white/90 leading-relaxed mb-3 whitespace-pre-line">
                  {t("invite.inviteDesc")}
                </p>
                <input
                  type="text"
                  readOnly
                  value={referralUrl}
                  onFocus={(e) => e.target.select()}
                  className="w-full rounded-xl bg-black/40 p-3 font-mono text-sm text-white border border-white/10 outline-none cursor-text"
                />
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!referralUrl}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-display font-bold text-sm text-white disabled:opacity-50 hover:opacity-95 transition-opacity mb-4 border border-[#00E676]/30 shadow-[0_0_20px_rgba(0,230,118,0.25)]"
                style={{
                  background: "linear-gradient(90deg,#00E676,#00c853)",
                }}
              >
                <Copy size={18} strokeWidth={2.5} />
                {t("invite.copyLink")}
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  disabled={!referralUrl}
                  className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 font-display font-semibold text-xs text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={handleTelegramShare}
                  disabled={!referralUrl}
                  className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 rounded-xl bg-[#0088cc] py-2.5 font-display font-semibold text-xs text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <Send size={16} />
                  Telegram
                </button>
                <button
                  type="button"
                  onClick={handleFacebookShare}
                  disabled={!referralUrl}
                  className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 rounded-xl bg-[#1877f2] py-2.5 font-display font-semibold text-xs text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <Share2 size={16} />
                  Facebook
                </button>
                <button
                  type="button"
                  onClick={handleTikTokShare}
                  disabled={!referralUrl}
                  className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 rounded-xl bg-black py-2.5 font-display font-semibold text-xs text-white border border-white/20 disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <Camera size={16} />
                  TikTok
                </button>
                <button
                  type="button"
                  onClick={handleInstagramShare}
                  disabled={!referralUrl}
                  className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#833ab4] py-2.5 font-display font-semibold text-xs text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <Instagram size={16} />
                  Instagram
                </button>
              </div>
            </>
          )}
        </div>

        {/* Friends Joined Progress */}
        <div
          className="mt-6 rounded-2xl p-4"
          style={{
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border-2"
              style={{ borderColor: "rgba(0,230,118,0.4)" }}
            >
              <UserPlus size={24} className="text-[#00E676]" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-white">
                {t("invite.friendsJoined", { count: friendsJoined })}
              </p>
              <p className="text-[10px] text-white/68">
                {t("invite.friendsJoinedDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* Info card */}
        <div
          className="mt-6 rounded-2xl p-4"
          style={{
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p className="text-xs text-white/85 leading-relaxed">
            {t("invite.infoCard")}
          </p>
        </div>
      </div>

      <LegalFooter />
      <BottomNav />
    </div>
  );
}
