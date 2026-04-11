import { useState, useCallback, useEffect } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { SurveyDisplay } from "@/hooks/useBitLabsSurveys";
import { useUser } from "@/contexts/UserContext";
import { USER_TICKETS_QUERY_KEY } from "@/hooks/useUserTickets";
import { invalidateLotteryPoolQueries } from "@/hooks/invalidateLotteryPoolQueries";
import { getCpxUiLanguage } from "@/lib/cpxResearch";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Simple MD5 hash function for browser environment
function md5Hash(input: string): string {
  // Based on Joseph Myers' implementation
  const rotateLeft = (x: number, n: number) => (x << n) | (x >>> (32 - n));
  const addUnsigned = (x: number, y: number) => (x + y) >>> 0;
  
  const s: number[] = [];
  for (let i = 0; i < 64; i++) {
    s[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
  }
  
  const k: number[] = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
  ];
  
  const r: number[] = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];
  
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  
  // Convert to words
  const msg: number[] = [];
  for (let i = 0; i < input.length; i++) {
    msg[i >>> 2] |= (input.charCodeAt(i) & 0xff) << ((i % 4) * 8);
  }
  msg[input.length >>> 2] |= 0x80 << ((input.length % 4) * 8);
  msg[(((input.length + 64) >>> 9) << 4) + 14] = input.length * 8;
  
  for (let i = 0; i < msg.length; i += 16) {
    let a = h0, b = h1, c = h2, d = h3;
    
    for (let j = 0; j < 64; j++) {
      let f: number, g: number;
      if (j < 16) {
        f = (b & c) | ((~b) & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | ((~d) & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | (~d));
        g = (7 * j) % 16;
      }
      
      const temp = d;
      d = c;
      c = b;
      b = addUnsigned(b, rotateLeft(addUnsigned(addUnsigned(a, f), addUnsigned(k[j], msg[i + g])), r[j]));
      a = temp;
    }
    
    h0 = addUnsigned(h0, a);
    h1 = addUnsigned(h1, b);
    h2 = addUnsigned(h2, c);
    h3 = addUnsigned(h3, d);
  }
  
  return [h0, h1, h2, h3].map(h => {
    const hex = h.toString(16);
    return hex.length < 8 ? '0'.repeat(8 - hex.length) + hex : hex;
  }).join('').toLowerCase();
}

interface SurveysCardProps {
  surveys: SurveyDisplay[];
  isLoading: boolean;
  onSelect: (survey: SurveyDisplay) => void;
  autoOpen?: boolean;
}

const TICKETS_PER_ENTRY = 10;

// Reward tier calculation based on survey duration (minutes)
const getTicketCount = (minutes: number): number => {
  if (minutes < 1) return 1;
  if (minutes <= 3) return 2;
  return 3;
};

// Build CPX survey URL with user ID and secure_hash
const buildCpxUrl = (userId: string): string => {
  const appId = import.meta.env.VITE_CPX_APP_ID ?? "";
  const secureHashSecret = import.meta.env.VITE_CPX_SECURE_HASH ?? "";
  const baseUrl = "https://offers.cpx-research.com/index.php";
  
  // Generate secure_hash: md5(`${userId}-${secureHashSecret}`)
  const secureHash = secureHashSecret ? md5Hash(`${userId}-${secureHashSecret}`) : "";
  
  const params = new URLSearchParams({
    app_id: appId,
    ext_user_id: userId,
  });
  
  if (secureHash) {
    params.append("secure_hash", secureHash);
  }
  
  return `${baseUrl}?${params.toString()}`;
};

export default function SurveysCard({ surveys, isLoading, onSelect, autoOpen }: SurveysCardProps) {
  const { t } = useTranslation();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [goldenShaking, setGoldenShaking] = useState(false);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [isOpeningSurvey, setIsOpeningSurvey] = useState(false);

  const language = getCpxUiLanguage();
  const isIndonesian = language === "id";

  const hasSurveys = surveys.length > 0;

  // Auto-trigger CPX survey when autoOpen is true and no BitLabs surveys available
  useEffect(() => {
    if (autoOpen && !isLoading && user?.id && !hasSurveys && !isOpeningSurvey) {
      // Small delay to allow card to render first
      const timer = setTimeout(() => {
        void handleOpenCpxSurvey();
      }, 500);
      return () => clearTimeout(timer);
    }
    // If autoOpen with surveys, open the modal instead
    if (autoOpen && !isLoading && hasSurveys) {
      setIsSurveyModalOpen(true);
    }
  }, [autoOpen, isLoading, user?.id, hasSurveys, isOpeningSurvey]);

  const handleOpenCpxSurvey = useCallback(async () => {
    if (!user?.id || isOpeningSurvey) return;
    
    setIsOpeningSurvey(true);
    const toastId = toast.loading(isIndonesian ? "Membuka survei..." : "Opening survey...");
    
    try {
      // Save survey_started_at to database before opening
      const { error } = await supabase.from("survey_rewards").insert({
        user_id: user.id,
        provider: "cpx",
        transaction_id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: "completed", // Will be updated by webhook on actual completion
        survey_started_at: new Date().toISOString(),
        tickets_granted: 0, // Will be updated by webhook
        hash_verified: false,
        raw_payload: { source: "frontend_click", clicked_at: new Date().toISOString() },
        country_code: user.countryCode ?? "ID",
      });

      if (error && !error.message?.includes("duplicate")) {
        console.error("Failed to save survey start:", error);
      }

      // Build and open CPX URL with ext_user_id
      const cpxUrl = buildCpxUrl(user.id);
      
      await new Promise((r) => setTimeout(r, 380));
      
      const w = window.open(cpxUrl, "_blank", "noopener,noreferrer");
      if (!w) {
        toast.error(isIndonesian ? "Popup diblokir" : "Popup blocked", {
          description: isIndonesian ? "Izinkan popup untuk situs ini." : "Allow popups for this site.",
        });
      }

      // Set up polling to check for new survey completions
      const checkForCompletion = setInterval(() => {
        // Refresh ticket balance and draw progress
        queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
        queryClient.invalidateQueries({ queryKey: ["userStats"] });
        queryClient.invalidateQueries({ queryKey: ["user_tickets"] });
        invalidateLotteryPoolQueries(queryClient);
      }, 5000);

      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(checkForCompletion), 120000);
      
    } finally {
      toast.dismiss(toastId);
      setIsOpeningSurvey(false);
    }
  }, [user?.id, user?.countryCode, isOpeningSurvey, isIndonesian, queryClient]);

  const triggerGoldenShake = () => {
    setGoldenShaking(true);
    setTimeout(() => setGoldenShaking(false), 580);
  };

  const handleStart = (survey: SurveyDisplay, isFeatured: boolean) => {
    if (isFeatured) triggerGoldenShake();
    onSelect(survey);
  };

  const canBrowse = !isLoading && surveys.length > 0;

  const handleCardActivate = () => {
    if (canBrowse) setIsSurveyModalOpen(true);
  };

  const handlePickSurvey = (survey: SurveyDisplay, isFeatured: boolean) => {
    handleStart(survey, isFeatured);
    setIsSurveyModalOpen(false);
  };

  return (
    <div
      onClick={handleCardActivate}
      className="relative overflow-hidden rounded-3xl p-5 bg-zinc-900/60 backdrop-blur-3xl border border-white/10 shadow-2xl animate-shake-mount cursor-pointer transition-transform hover:scale-[1.01]"
      style={{ boxShadow: "0 0 24px rgba(168,85,247,0.2)" }}
    >
      {/* Ambient overlays */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-40"
        style={{ background: "radial-gradient(ellipse at 20% 20%, rgba(168,85,247,0.15) 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-30"
        style={{ background: "radial-gradient(ellipse at 80% 80%, rgba(236,72,153,0.12) 0%, transparent 65%)" }}
      />

      {/* Header */}
      <div className="flex items-start gap-3 mb-5 relative z-10">
        {/* Icon container */}
        <div
          className="relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 animate-breathing-glow"
          style={{ background: "#0a0a0c", border: "1px solid rgba(168,85,247,0.3)" }}
        >
          <div
            className="absolute inset-0 rounded-2xl opacity-50"
            style={{ background: "radial-gradient(ellipse at 30% 30%, rgba(168,85,247,0.35) 0%, transparent 70%)" }}
          />
          <div
            className="absolute inset-0 rounded-2xl opacity-35"
            style={{ background: "radial-gradient(ellipse at 70% 70%, rgba(236,72,153,0.25) 0%, transparent 65%)" }}
          />
          {/* Clipboard wireframe SVG */}
          <svg
            viewBox="0 0 36 44"
            width="24"
            height="24"
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 5px rgba(255,255,255,0.7)) drop-shadow(0 0 10px rgba(168,85,247,0.5))", position: "relative", zIndex: 1 }}
          >
            {/* Clipboard body */}
            <rect x="2" y="6" width="32" height="36" rx="3" />
            {/* Clip at top */}
            <path d="M12 2 Q18 0 24 2 L24 8 Q18 6 12 8 Z" />
            {/* Lines */}
            <line x1="8" y1="17" x2="28" y2="17" strokeWidth="1.2" />
            <line x1="8" y1="23" x2="28" y2="23" strokeWidth="1.2" />
            <line x1="8" y1="29" x2="20" y2="29" strokeWidth="1.2" />
            {/* Check mark */}
            <polyline points="22,27 25,31 30,25" strokeWidth="1.8" stroke="rgba(74,222,128,0.9)" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-white text-base leading-tight tracking-tight">
            Complete Surveys
          </h3>
          <p className="text-xs text-white/60 mt-0.5">Earn tickets directly</p>
          <p className="text-xs font-semibold mt-1 text-[#4ade80] drop-shadow-[0_0_8px_rgba(74,222,128,0.7)]">
            Based on survey duration
          </p>
        </div>
      </div>

      {/* Survey list */}
      <div className="relative z-10 space-y-3">
        {isLoading ? (
          <div className="flex flex-col gap-2 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : surveys.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-white/40">No surveys available right now.</p>
            <p className="text-xs text-white/25 mt-1">Check back later!</p>
          </div>
        ) : (
          surveys.map((survey, index) => {
            const isFeatured = index === 0;
            return isFeatured ? (
              <GoldenSurveyRow
                key={survey.id}
                survey={survey}
                isShaking={goldenShaking}
                onStart={() => handleStart(survey, true)}
              />
            ) : (
              <StandardSurveyRow
                key={survey.id}
                survey={survey}
                onStart={() => handleStart(survey, false)}
              />
            );
          })
        )}
      </div>

      {/* Reward Tiers Info */}
      <div className="relative z-10 mt-3 p-3 rounded-xl bg-white/5 border border-white/10">
        <p className="text-[10px] font-semibold text-white/70 mb-2 uppercase tracking-wide">
          {isIndonesian ? "Tingkat Hadiah" : "Reward Tiers"}
        </p>
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-white/60">&lt;1 {isIndonesian ? "menit" : "min"}</span>
            <span className="font-bold text-green-400">= 1 {t("common.ticket")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-white/60">1-3 {isIndonesian ? "menit" : "min"}</span>
            <span className="font-bold text-yellow-400">= 2 {t("common.tickets")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-400" />
            <span className="text-white/60">3+ {isIndonesian ? "menit" : "min"}</span>
            <span className="font-bold text-pink-400">= 3 {t("common.tickets")}</span>
          </div>
        </div>
        <p className="text-[10px] text-white/50 mt-2 text-center">
          {TICKETS_PER_ENTRY} {t("common.tickets")} = 1 {isIndonesian ? "undian akhir pekan" : "weekend draw entry"}
        </p>
      </div>

      <Button
        type="button"
        disabled={isLoading || !user?.id || isOpeningSurvey}
        onClick={(e) => {
          e.stopPropagation();
          if (hasSurveys) {
            setIsSurveyModalOpen(true);
          } else {
            void handleOpenCpxSurvey();
          }
        }}
        className="relative z-10 mt-4 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          t("common.loading")
        ) : isOpeningSurvey ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            {isIndonesian ? "Membuka..." : "Opening..."}
          </span>
        ) : hasSurveys ? (
          t("earn.surveys.browse")
        ) : (
          isIndonesian ? "Buka Survei" : "Open Surveys"
        )}
      </Button>

      <Dialog open={isSurveyModalOpen} onOpenChange={setIsSurveyModalOpen}>
        <DialogContent
          className="max-h-[85vh] overflow-y-auto border-white/10 bg-zinc-900/95 text-white sm:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-white">Browse Surveys</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {surveys.map((survey, index) => {
              const isFeatured = index === 0;
              return isFeatured ? (
                <GoldenSurveyRow
                  key={survey.id}
                  survey={survey}
                  isShaking={goldenShaking}
                  onStart={() => handlePickSurvey(survey, true)}
                />
              ) : (
                <StandardSurveyRow
                  key={survey.id}
                  survey={survey}
                  onStart={() => handlePickSurvey(survey, false)}
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Golden Ticket (Featured) Row
────────────────────────────────────────────── */
function GoldenSurveyRow({
  survey,
  isShaking,
  onStart,
}: {
  survey: SurveyDisplay;
  isShaking: boolean;
  onStart: () => void;
}) {
  const shakeStyle: CSSProperties = isShaking
    ? { animation: "card-shake 0.55s ease-in-out forwards" }
    : {};

  return (
    <div
      className="relative rounded-2xl p-4 flex items-center gap-3 transition-all duration-250 hover:scale-[1.02]"
      style={{
        background: "rgba(10,8,2,0.75)",
        border: "1px solid rgba(251,191,36,0.35)",
        backdropFilter: "blur(16px)",
        animation: isShaking ? "card-shake 0.55s ease-in-out forwards" : "gold-breathing-glow 3s ease-in-out infinite",
        ...(!isShaking && {}),
      }}
    >
      {/* BEST OFFER badge */}
      <span
        className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wide"
        style={{
          background: "rgba(251,191,36,0.15)",
          border: "1px solid rgba(251,191,36,0.4)",
          color: "#fbbf24",
          textShadow: "0 0 8px rgba(251,191,36,0.6)",
        }}
      >
        🔥 Best Offer
      </span>

      {/* Icon */}
      <div
        className="relative shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: "#0a0a0c",
          border: "1px solid rgba(251,191,36,0.35)",
          boxShadow: "0 0 12px rgba(251,191,36,0.4), inset 0 0 8px rgba(251,191,36,0.06)",
        }}
      >
        <div
          className="absolute inset-0 rounded-xl opacity-60"
          style={{ background: "radial-gradient(ellipse at center, rgba(251,191,36,0.25) 0%, transparent 70%)" }}
        />
        <span className="text-xl relative z-10" style={{ filter: "drop-shadow(0 0 6px rgba(251,191,36,0.8))" }}>
          📋
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pr-20">
        <h4 className="font-display font-bold text-white text-sm leading-tight truncate">
          {survey.title || "BitLabs Survey"}
        </h4>
        <p
          className="text-sm font-bold mt-1"
          style={{ color: "#fbbf24", textShadow: "0 0 10px rgba(251,191,36,0.7)" }}
        >
          🎟️ TICKETS
        </p>
      </div>

      {/* Golden START button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStart();
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 shrink-0 px-4 py-2 rounded-xl font-display font-bold text-xs text-[#1a0d00] transition-all duration-200 hover:scale-[1.05] active:scale-[0.96]"
        style={{
          background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
          animation: "gold-pulse-btn 1.6s ease-in-out infinite",
        }}
      >
        START
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Standard Survey Row
────────────────────────────────────────────── */
function StandardSurveyRow({
  survey,
  onStart,
}: {
  survey: SurveyDisplay;
  onStart: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative rounded-2xl p-4 flex items-center gap-3 transition-all duration-200"
      style={{
        background: "rgba(10,8,14,0.65)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(14px)",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        boxShadow: hovered
          ? "0 0 20px rgba(168,85,247,0.35), 0 4px 16px rgba(0,0,0,0.4)"
          : "0 0 0 transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon */}
      <div
        className="relative shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: "#0a0a0c",
          border: "1px solid rgba(168,85,247,0.25)",
          boxShadow: "0 0 10px rgba(168,85,247,0.3)",
          transition: "box-shadow 0.2s",
        }}
      >
        <div
          className="absolute inset-0 rounded-xl opacity-40"
          style={{ background: "radial-gradient(ellipse at center, rgba(168,85,247,0.2) 0%, transparent 70%)" }}
        />
        <span className="text-xl relative z-10" style={{ filter: "drop-shadow(0 0 5px rgba(168,85,247,0.6))" }}>
          📋
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pr-20">
        <h4 className="font-display font-bold text-white text-sm leading-tight truncate">
          {survey.title || "BitLabs Survey"}
        </h4>
        <p
          className="text-sm font-bold mt-1 text-[#4ade80]"
          style={{ textShadow: "0 0 8px rgba(74,222,128,0.6)" }}
        >
          🎟️ TICKETS
        </p>
      </div>

      {/* Magenta START button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStart();
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 shrink-0 px-4 py-2 rounded-xl font-display font-bold text-xs text-white transition-all duration-200 hover:scale-[1.06] active:scale-[0.96]"
        style={{
          background: "linear-gradient(135deg, #ec4899 0%, #c026d3 50%, #7c3aed 100%)",
          boxShadow: "0 0 14px rgba(236,72,153,0.5), 0 3px 8px rgba(0,0,0,0.35)",
        }}
      >
        START
      </button>
    </div>
  );
}
