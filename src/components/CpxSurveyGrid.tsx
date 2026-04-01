import { useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  Clock,
  Coins,
  RefreshCw,
  Ticket,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCpxSurveys } from "@/hooks/useCpxSurveys";
import { getCpxUiLanguage, type CpxSurvey } from "@/lib/cpxResearch";
import {
  formatSurveyAmountIdr,
  getSurveyMinutes,
  getTicketCount,
  resolveCpxSurveyHref,
} from "@/lib/cpxSurveyDisplay";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const OPEN_TOAST_MS = 380;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 28 },
  },
};

export interface CpxSurveyGridProps {
  appId: string;
  extUserId: string;
  secureHash?: string;
  email?: string;
  username?: string;
  enabled?: boolean;
  className?: string;
}

function formatCategoryLabel(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 32);
}

export function CpxSurveyGrid({
  appId,
  extUserId,
  secureHash,
  email,
  username,
  enabled = true,
  className,
}: CpxSurveyGridProps) {
  const language = getCpxUiLanguage();
  const isIndonesian = language === "id";

  const copy = useMemo(
    () => ({
      sectionTitle: isIndonesian ? "Survei CPX Research" : "CPX Research Surveys",
      completeSurvey: isIndonesian ? "Selesaikan Survei" : "Complete Survey",
      minutes: isIndonesian ? "Menit" : "Minutes",
      ticketWord: isIndonesian ? "Tiket" : "Ticket",
      hurry: isIndonesian ? "Cepat! Slot terbatas" : "Hurry! Limited slots",
      opening: isIndonesian ? "Membuka survei..." : "Opening survey...",
      emptyTitle: isIndonesian ? "Belum ada survei" : "No surveys right now",
      emptyDesc: isIndonesian
        ? "Cek lagi nanti — survei baru muncul secara berkala."
        : "Check back soon — new surveys appear regularly.",
      errorTitle: isIndonesian ? "Gagal memuat survei" : "Couldn’t load surveys",
      retry: isIndonesian ? "Coba lagi" : "Try again",
      earnTickets: (n: number) =>
        isIndonesian ? `Dapatkan ${n} Tiket` : `Earn ${n} Tickets`,
      signInTitle: isIndonesian ? "Masuk untuk survei CPX" : "Sign in for CPX surveys",
      signInDesc: isIndonesian
        ? "Survei berbayar dan tiket undian tersedia setelah Anda masuk."
        : "Paid surveys and draw tickets are available after you sign in.",
    }),
    [isIndonesian]
  );

  const canLoad = Boolean(appId && extUserId && enabled);

  const { surveys, loading, error, refetch } = useCpxSurveys({
    appId,
    extUserId,
    secureHash,
    email,
    enabled: canLoad,
    hl: language,
  });

  const openingRef = useRef(false);

  const handleOpenSurvey = useCallback(
    async (survey: CpxSurvey) => {
      if (openingRef.current) return;
      openingRef.current = true;
      const href = resolveCpxSurveyHref(survey, {
        appId,
        extUserId,
        secureHash,
        email,
        username,
      });
      const toastId = toast.loading(copy.opening);
      try {
        await new Promise((r) => setTimeout(r, OPEN_TOAST_MS));
        const w = window.open(href, "_blank", "noopener,noreferrer");
        if (!w) {
          toast.error(isIndonesian ? "Popup diblokir" : "Popup blocked", {
            description: isIndonesian
              ? "Izinkan popup untuk situs ini."
              : "Allow popups for this site.",
          });
        }
      } finally {
        toast.dismiss(toastId);
        openingRef.current = false;
      }
    },
    [appId, copy.opening, email, extUserId, isIndonesian, secureHash, username]
  );

  if (!appId) {
    return null;
  }

  if (!extUserId || !enabled) {
    return (
      <section className={cn("w-full", className)}>
        <h2 className="font-display text-base font-bold text-white tracking-tight mb-3">
          {copy.sectionTitle}
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a0f3c]/85 to-[#0d0620]/90 backdrop-blur-xl p-6 text-center"
        >
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-theme-purple/20 border border-theme-purple/30">
            <Ticket className="size-6 text-theme-pink" />
          </div>
          <p className="font-display font-semibold text-white">{copy.signInTitle}</p>
          <p className="text-sm text-white/60 mt-2 max-w-md mx-auto">{copy.signInDesc}</p>
        </motion.div>
      </section>
    );
  }

  const showSkeleton = loading && surveys.length === 0;
  const showError = !!error && !loading && surveys.length === 0;
  const showEmpty = !loading && !error && surveys.length === 0;

  return (
    <section className={cn("w-full", className)}>
      <div className="flex flex-col gap-1 mb-4">
        <h2 className="font-display text-base font-bold text-white tracking-tight">
          {copy.sectionTitle}
        </h2>
      </div>

      {showError && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-red-500/30 bg-red-950/25 backdrop-blur-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        >
          <div className="flex items-start gap-3 flex-1">
            <div className="rounded-xl bg-red-500/15 p-2 border border-red-500/25">
              <AlertCircle className="size-5 text-red-400 shrink-0" />
            </div>
            <div>
              <p className="font-display font-semibold text-white">{copy.errorTitle}</p>
              <p className="text-sm text-white/60 mt-1">{error.message}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refetch()}
            className="shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            <RefreshCw className="size-4 mr-2" />
            {copy.retry}
          </Button>
        </motion.div>
      )}

      {showSkeleton && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-[#1a0f3c]/40 p-4 pt-10 space-y-4 overflow-hidden"
            >
              <Skeleton className="h-5 w-20 rounded-full ml-auto" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {showEmpty && !showError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a0f3c]/80 to-[#0d0620]/90 backdrop-blur-xl p-10 text-center"
        >
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-theme-purple/20 border border-theme-purple/30">
            <ClipboardList className="size-7 text-theme-purple" />
          </div>
          <p className="font-display font-bold text-lg text-white">{copy.emptyTitle}</p>
          <p className="text-sm text-white/55 mt-2 max-w-sm mx-auto">{copy.emptyDesc}</p>
          <Button
            type="button"
            variant="ghost"
            className="mt-6 text-theme-pink hover:text-white hover:bg-white/10"
            onClick={() => void refetch()}
          >
            <RefreshCw className="size-4 mr-2" />
            {copy.retry}
          </Button>
        </motion.div>
      )}

      {surveys.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {surveys.map((survey) => {
            const minutes = getSurveyMinutes(survey);
            const tickets = getTicketCount(minutes);
            const amountLabel = formatSurveyAmountIdr(survey);
            const category =
              formatCategoryLabel(survey.provider) ?? formatCategoryLabel(survey.category);
            const typeBadge = formatCategoryLabel(survey.type);

            return (
              <motion.button
                key={survey.id}
                type="button"
                variants={itemVariants}
                whileHover={{
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 400, damping: 22 },
                }}
                whileTap={{ scale: 0.99 }}
                onClick={() => void handleOpenSurvey(survey)}
                className={cn(
                  "relative text-left rounded-2xl border border-white/10",
                  "bg-gradient-to-br from-[#1e1540]/95 via-[#151030]/95 to-[#0a0618]/95",
                  "backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)]",
                  "p-4 pt-11 pb-4 outline-none transition-shadow duration-300",
                  "hover:border-theme-pink/35 hover:shadow-[0_0_32px_rgba(155,92,255,0.28),0_0_48px_rgba(255,78,205,0.12)]",
                  "focus-visible:ring-2 focus-visible:ring-theme-pink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0620]"
                )}
              >
                <span
                  className={cn(
                    "absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1",
                    "text-[10px] font-bold tracking-wide text-white",
                    "bg-gradient-to-r from-theme-pink to-theme-purple",
                    "shadow-[0_0_18px_rgba(255,78,205,0.55)] border border-white/10"
                  )}
                >
                  <Ticket className="size-3.5 shrink-0" aria-hidden />
                  {copy.earnTickets(tickets)}
                </span>

                {(category || typeBadge) && (
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[58%]">
                    {category && (
                      <span className="rounded-md bg-white/8 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80 truncate max-w-full">
                        {category}
                      </span>
                    )}
                    {typeBadge && typeBadge !== category && (
                      <span className="rounded-md bg-theme-purple/20 border border-theme-purple/35 px-2 py-0.5 text-[10px] font-medium text-theme-pink/95 truncate max-w-full">
                        {typeBadge}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 text-theme-green mt-1">
                  <Coins className="size-5 shrink-0" aria-hidden />
                  <span className="font-display text-lg font-bold text-white tabular-nums">
                    {amountLabel}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-white/65">
                  <Clock className="size-4 shrink-0 text-theme-purple" aria-hidden />
                  <span>
                    ~{minutes} {copy.minutes}
                  </span>
                  {survey.statistics_rating_count > 0 && (
                    <span className="text-white/40">·</span>
                  )}
                  {survey.statistics_rating_count > 0 && (
                    <span className="text-xs text-white/50">
                      ★ {survey.statistics_rating_avg} ({survey.statistics_rating_count})
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                  <span className="text-xs font-semibold text-white/90">{copy.completeSurvey}</span>
                  <ArrowUpRight className="size-4 text-theme-pink shrink-0" aria-hidden />
                </div>

                <p className="mt-2 text-[10px] text-center text-theme-pink/70 font-medium">
                  {copy.hurry}
                </p>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}

export default CpxSurveyGrid;
