import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { X, Camera, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCreateReceipt } from "@/hooks/useReceipts";
import { useReceiptsToday } from "@/hooks/useReceipts";
import { useCreateDeal } from "@/hooks/useCreateDeal";
import { useUserLocation } from "@/hooks/useUserLocation";
import { grantDealTickets } from "@/hooks/useGrantDealTickets";
import { useQueryClient } from "@tanstack/react-query";
import { USER_TICKETS_QUERY_KEY } from "@/hooks/useUserTickets";
import { toast } from "sonner";
import { hashBlob, wasDuplicateToday, markHashUsed } from "@/lib/imageHash";
import {
  useRedLabelsToday,
  MAX_RECEIPTS_PER_DAY,
  MAX_RED_LABELS_PER_DAY,
  RED_LABELS_TODAY_KEY,
} from "@/hooks/useUploadLimits";

const USER_FACING_ERROR = "Upload failed. Please try again.";

export type CameraMode = "receipt" | "red_label";

interface CameraScannerProps {
  onClose: () => void;
  mode?: CameraMode;
}

export default function CameraScanner({ onClose, mode = "receipt" }: CameraScannerProps) {
  const { user } = useUser();
  const createReceipt = useCreateReceipt();
  const createDeal = useCreateDeal();
  const queryClient = useQueryClient();
  const { location, error: locationError } = useUserLocation();
  const { data: todayCount = 0 }        = useReceiptsToday(user?.id ?? undefined);
  const { data: redLabelTodayCount = 0 } = useRedLabelsToday(user?.id ?? undefined);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<"camera" | "type" | "preview" | "form" | "processing" | "success" | "error">("camera");
  // Resolved after the user picks a type on the "type" selection screen.
  // Defaults to the prop so callers can still pre-select a mode.
  const [selectedType, setSelectedType] = useState<CameraMode>(mode);
  const isRedLabel = selectedType === "red_label";
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redLabelForm, setRedLabelForm] = useState({ product_name: "", price: "", store: "", discount: "" });
  // Holds the SHA-256 hash of the last captured blob so we can register
  // it in localStorage only after a *successful* upload (not on capture).
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  // Counts successful uploads in this session for the streak display.
  const [scanStreak, setScanStreak] = useState(0);

  const userId = user?.id;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        console.error("Camera error:", e);
        if (mounted) {
          setError("Cannot access camera");
          setStep("error");
        }
      }
    };
    if (step === "camera") {
      startCamera();
    }
    return () => {
      mounted = false;
      if (step === "preview" || step === "camera") stopCamera();
    };
  }, [step]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !userId) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // ── Hash + duplicate check, then go to type-selection ────────────────
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const hash = await hashBlob(blob);
      if (wasDuplicateToday(String(userId), hash)) {
        setError("This image was already uploaded today.");
        setStep("error");
        return;
      }

      setPendingHash(hash);
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
      setStep("type");   // always land on type-selection first
    }, "image/jpeg", 0.9);
  }, [userId, stopCamera]);

  // Called when user picks a type on the selection screen.
  const handleSelectType = useCallback((type: CameraMode) => {
    if (type === "receipt" && todayCount >= MAX_RECEIPTS_PER_DAY) {
      toast.error(`Daily receipt limit reached (max ${MAX_RECEIPTS_PER_DAY} per day)`);
      return;
    }
    if (type === "red_label" && redLabelTodayCount >= MAX_RED_LABELS_PER_DAY) {
      toast.error(`Daily red label limit reached (max ${MAX_RED_LABELS_PER_DAY} per day)`);
      return;
    }
    setSelectedType(type);
    setStep(type === "red_label" ? "form" : "preview");
  }, [todayCount, redLabelTodayCount]);

  const handleRetake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setPendingHash(null);
    setSelectedType(mode);
    setError(null);
    setStep("camera");
  }, [previewUrl, mode]);

  // "Scan Again" on the success screen — keeps streak alive.
  const handleScanAgain = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setPendingHash(null);
    setSelectedType(mode);
    setError(null);
    setStep("camera");
  }, [previewUrl, mode]);

  const handleSubmitReceipt = useCallback(async () => {
    if (!capturedBlob || !userId) return;

    setStep("processing");
    setError(null);

    try {
      const file = new File([capturedBlob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
      const storagePath = `${String(userId)}/${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(storagePath, file, { upsert: false, contentType: "image/jpeg" });

      if (uploadError || !uploadData?.path) {
        const msg = uploadError?.message ?? "Upload path missing";
        console.log("Storage Error Detayı:", uploadError);
        console.error("[CameraScanner] Receipt storage upload failed:", { uploadError, msg });
        throw new Error(`Upload failed: ${msg}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(uploadData.path);

      const receiptIndexToday = todayCount + 1;

      try {
        await createReceipt.mutateAsync({
          userId: String(userId),
          imageUrl: publicUrl,
          store: null,
          total: null,
          receiptIndexToday,
        });
      } catch (dbErr) {
        console.error("[CameraScanner] Receipt DB insert failed:", dbErr);
      }

      // Register hash so the same image cannot be re-submitted today
      if (userId && pendingHash) markHashUsed(String(userId), pendingHash);
      setPendingHash(null);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCapturedBlob(null);
      toast.success("You earned +1 ticket 🎉");
      setScanStreak((s) => s + 1);
      setStep("success");
    } catch (e) {
      const err = e as Error & { message?: string; code?: string };
      console.error("[CameraScanner] Receipt upload error:", {
        message: err?.message,
        code: err?.code,
        full: e,
      });
      setError(USER_FACING_ERROR);
      setStep("error");
    }
  }, [capturedBlob, userId, todayCount, pendingHash, createReceipt, previewUrl]);

  const handleSubmitRedLabel = useCallback(async () => {
    if (!capturedBlob || !userId) return;
    const { product_name, store, price, discount } = redLabelForm;
    if (!product_name.trim() || !store.trim()) {
      setError("Ürün adı ve market adresi zorunludur.");
      return;
    }

    setStep("processing");
    setError(null);

    try {
      console.log("[RedLabel] 1. Başlangıç - userId:", userId);
      const file = new File([capturedBlob], `deal-${Date.now()}.jpg`, { type: "image/jpeg" });

      const storagePathDeals = `deals/${String(userId)}/${Date.now()}.jpg`;
      console.log("[RedLabel] 2. Storage upload başlıyor - bucket: receipts, path:", storagePathDeals);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(storagePathDeals, file, { upsert: false, contentType: "image/jpeg" });

      if (uploadError || !uploadData?.path) {
        const msg = uploadError?.message ?? "Upload path missing";
        console.log("Storage Error Detayı:", uploadError);
        console.error("[CameraScanner] Red Label storage upload failed:", { uploadError, msg });
        throw new Error(`Upload failed: ${msg}`);
      }
      console.log("[RedLabel] 3. Storage upload OK - path:", uploadData.path);

      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(uploadData.path);
      console.log("[RedLabel] 4. Public URL alındı:", publicUrl?.slice(0, 60) + "...");

      const discountNum = discount ? parseInt(discount, 10) : undefined;
      const priceNum = price ? parseInt(price.replace(/\D/g, ""), 10) : undefined;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      const isRedLabelFlag = (discountNum ?? 0) >= 50;

      const lat = Number(location?.lat);
      const lng = Number(location?.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.error("[CameraScanner] Invalid coordinates:", { lat, lng, location });
        setError("Konum geçersiz. Lütfen GPS iznini kontrol edin.");
        setStep("error");
        return;
      }
      console.log("[RedLabel] 5. Koordinatlar OK - lat:", lat, "lng:", lng);

      console.log("[RedLabel] 6. deals tablosuna insert başlıyor");
      await createDeal.mutateAsync({
        lat,
        lng,
        product_name: product_name.trim(),
        price: priceNum,
        store: store.trim(),
        image_url: publicUrl,
        discount: discountNum,
        expiry: expiry.toISOString(),
        is_red_label: isRedLabelFlag,
        user_id: userId,
      });
      console.log("[RedLabel] 7. deals insert OK");

      console.log("[RedLabel] 8. grantDealTickets RPC çağrılıyor");
      await grantDealTickets();
      console.log("[RedLabel] 9. grantDealTickets OK - tamamlandı");
      queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      queryClient.invalidateQueries({ queryKey: [...RED_LABELS_TODAY_KEY, userId] });
      toast.success("You earned +3 tickets 🔥");

      // Register hash so the same image cannot be re-submitted today
      if (userId && pendingHash) markHashUsed(String(userId), pendingHash);
      setPendingHash(null);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCapturedBlob(null);
      setRedLabelForm({ product_name: "", price: "", store: "", discount: "" });
      setScanStreak((s) => s + 1);
      setStep("success");
    } catch (e) {
      console.log("Storage Error Detayı:", e);
      const err = e as Error & { message?: string; code?: string };
      const detail = err?.message ?? err?.code ?? String(e);
      console.error("[CameraScanner] Red Label HATA - adım bilgisi için yukarıdaki [RedLabel] loglarına bakın:", {
        message: err?.message,
        code: err?.code,
        detail,
        full: e,
      });
      setError(USER_FACING_ERROR);
      setStep("error");
    }
  }, [capturedBlob, userId, pendingHash, redLabelForm, createDeal, location, previewUrl, queryClient]);

  const handleSubmit = isRedLabel ? handleSubmitRedLabel : handleSubmitReceipt;

  const handleClose = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    stopCamera();
    onClose();
  }, [stopCamera, onClose, previewUrl]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Camera viewfinder ─────────────────────────────────────────── */}
      {step === "camera" && (
        <>
          <div className="absolute inset-0">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-black/40">
            <button
              onClick={handleClose}
              className="rounded-full bg-black/50 p-2 text-white"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <span className="text-sm font-medium text-white">
              Scan receipt or red label
            </span>
            <div className="w-10" />
          </div>

          {/* Shutter */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center p-6 pb-12">
            <button
              onClick={handleCapture}
              disabled={
                todayCount >= MAX_RECEIPTS_PER_DAY &&
                redLabelTodayCount >= MAX_RED_LABELS_PER_DAY
              }
              className="flex h-18 w-18 h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-lg disabled:opacity-40 active:scale-95 transition-transform"
            >
              <Camera size={34} className="text-black" />
            </button>
          </div>
        </>
      )}

      {/* ── Type selection — shown after every capture ────────────────── */}
      {step === "type" && previewUrl && (
        <div className="absolute inset-0 flex flex-col bg-black">
          {/* Thumbnail */}
          <div className="relative flex-1 flex items-center justify-center bg-black/80 p-4">
            <img
              src={previewUrl}
              alt="Captured"
              className="max-h-full max-w-full object-contain rounded-xl"
            />
          </div>

          {/* Selection panel */}
          <div className="bg-[#0d0920] px-5 pt-6 pb-10 space-y-4">
            <p className="text-center text-base font-bold text-white mb-1">
              What did you scan?
            </p>

            {/* Receipt button */}
            <button
              onClick={() => handleSelectType("receipt")}
              disabled={todayCount >= MAX_RECEIPTS_PER_DAY}
              className="w-full flex items-center justify-between rounded-2xl px-5 py-4 border border-white/10 bg-white/5 disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧾</span>
                <span className="text-sm font-semibold text-white">Receipt</span>
              </div>
              <span
                className="text-sm font-bold rounded-full px-3 py-1"
                style={{
                  background: "rgba(0,230,118,0.12)",
                  color: "#00E676",
                  border: "1px solid rgba(0,230,118,0.25)",
                }}
              >
                +1 ticket
              </span>
            </button>

            {/* Red Label button */}
            <button
              onClick={() => handleSelectType("red_label")}
              disabled={redLabelTodayCount >= MAX_RED_LABELS_PER_DAY}
              className="w-full flex items-center justify-between rounded-2xl px-5 py-4 border border-red-500/20 bg-red-500/5 disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏷️</span>
                <span className="text-sm font-semibold text-white">Red Label</span>
              </div>
              <span
                className="text-sm font-bold rounded-full px-3 py-1"
                style={{
                  background: "rgba(255,68,68,0.15)",
                  color: "#ff7070",
                  border: "1px solid rgba(255,68,68,0.3)",
                }}
              >
                +3 tickets
              </span>
            </button>

            {/* Retake link */}
            <button
              onClick={handleRetake}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-white/40"
            >
              <RotateCcw size={14} />
              Retake photo
            </button>
          </div>
        </div>
      )}

      {/* Red Label form (after capture) */}
      {step === "form" && previewUrl && isRedLabel && (
        <div className="absolute inset-0 flex flex-col bg-black overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="text-sm font-medium text-white">İndirim Bilgileri</span>
            <button
              onClick={handleClose}
              className="rounded-full bg-black/50 p-2 text-white"
              aria-label="Kapat"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 p-4">
            <img
              src={previewUrl}
              alt="Product"
              className="w-full max-h-48 object-contain rounded-lg mb-4"
            />
            {locationError && (
              <div className="mb-3 rounded-lg border border-amber-500/50 bg-amber-500/20 p-3 text-xs text-amber-200">
                ⚠ Konum alınamadı. Haritada Jakarta merkez noktası kullanılacak. Devam edebilirsiniz.
              </div>
            )}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Ürün adı *"
                value={redLabelForm.product_name}
                onChange={(e) => setRedLabelForm((f) => ({ ...f, product_name: e.target.value }))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white placeholder:text-white/50"
              />
              <input
                type="text"
                placeholder="Market adresi *"
                value={redLabelForm.store}
                onChange={(e) => setRedLabelForm((f) => ({ ...f, store: e.target.value }))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white placeholder:text-white/50"
              />
              <input
                type="text"
                placeholder="Fiyat (Rp)"
                value={redLabelForm.price}
                onChange={(e) => setRedLabelForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white placeholder:text-white/50"
              />
              <input
                type="text"
                placeholder="İndirim (%)"
                value={redLabelForm.discount}
                onChange={(e) => setRedLabelForm((f) => ({ ...f, discount: e.target.value }))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white placeholder:text-white/50"
              />
            </div>
          </div>
          <div className="p-4 flex gap-3 border-t border-white/10">
            <button
              onClick={handleRetake}
              className="flex-1 rounded-xl border border-white/40 bg-black/50 py-3 text-sm font-medium text-white"
            >
              Yeniden Çek
            </button>
            <button
              onClick={handleSubmitRedLabel}
              className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white"
            >
              Post to Map (+3 Tickets)
            </button>
          </div>
        </div>
      )}

      {/* Preview (receipt mode) */}
      {step === "preview" && previewUrl && !isRedLabel && (
        <>
          <div className="absolute inset-0 flex items-center justify-center bg-black p-4">
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="max-h-full max-w-full object-contain rounded-lg"
            />
          </div>
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-black/40">
            <button
              onClick={handleRetake}
              className="rounded-full bg-black/50 p-2 text-white"
              aria-label="Retake"
            >
              <RotateCcw size={24} />
            </button>
            <span className="text-sm font-medium text-white">Receipt preview</span>
            <button
              onClick={handleClose}
              className="rounded-full bg-black/50 p-2 text-white"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex gap-3 p-4 pb-10">
            <button
              onClick={handleRetake}
              className="flex-1 rounded-xl border border-white/20 bg-black/50 py-3.5 text-sm font-medium text-white"
            >
              Retake
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 rounded-xl py-3.5 text-sm font-bold text-white"
              style={{
                background: "linear-gradient(90deg,#00c853,#00E676)",
                boxShadow: "0 0 20px rgba(0,230,118,0.35)",
              }}
            >
              Submit — +1 ticket 🎉
            </button>
          </div>
        </>
      )}

      {/* Processing */}
      {step === "processing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
            <p className="text-white font-medium">Uploading...</p>
          </div>
        </div>
      )}

      {/* Success with celebration */}
      {step === "success" && (
        <SuccessCelebration
          onClose={handleClose}
          onScanAgain={handleScanAgain}
          isRedLabel={isRedLabel}
          streak={scanStreak}
        />
      )}

      {/* Error */}
      {step === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-6">
          <p className="text-red-400 font-medium text-center mb-4">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setStep("camera"); setError(null); }}
              className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white"
            >
              Try Again
            </button>
            <button
              onClick={handleClose}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SuccessCelebrationProps {
  onClose: () => void;
  onScanAgain: () => void;
  isRedLabel?: boolean;
  streak: number;
}

function SuccessCelebration({ onClose, onScanAgain, isRedLabel, streak }: SuccessCelebrationProps) {
  const [visible, setVisible] = useState(false);
  const tickets = isRedLabel ? 3 : 1;

  const accentColor  = isRedLabel ? "#ff7070"            : "#00E676";
  const accentGlow   = isRedLabel ? "rgba(255,68,68,0.5)"  : "rgba(0,230,118,0.5)";
  const btnGradient  = isRedLabel
    ? "linear-gradient(90deg,#e53935,#ff4ecd)"
    : "linear-gradient(90deg,#00c853,#00E676)";
  const btnGlow      = isRedLabel
    ? "0 0 30px rgba(229,57,53,0.4), 0 4px 20px rgba(0,0,0,0.5)"
    : "0 0 30px rgba(0,200,83,0.4), 0 4px 20px rgba(0,0,0,0.5)";
  const bgGlow       = isRedLabel
    ? "radial-gradient(ellipse 70% 45% at 50% 35%, rgba(255,68,68,0.13), transparent)"
    : "radial-gradient(ellipse 70% 45% at 50% 35%, rgba(0,230,118,0.11), transparent)";

  useEffect(() => {
    // Step 1 — fade + scale in after a short pause
    const showTimer = setTimeout(() => setVisible(true), 120);

    // Step 2 — confetti after content is visible
    const confettiTimer = setTimeout(() => {
      const colors = isRedLabel
        ? ["#FF3B3B", "#FF6B6B", "#FFD166", "#FFE066", "#FFFFFF"]
        : ["#00E676", "#00c853", "#FFD600", "#FFFFFF", "#9b5cff"];

      confetti({ particleCount: isRedLabel ? 90 : 65, spread: 70, origin: { y: 0.55 }, colors });

      if (isRedLabel) {
        setTimeout(() => {
          confetti({ particleCount: 50, angle: 60,  spread: 55, origin: { x: 0 }, colors });
          confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors });
        }, 200);
      }
    }, 480);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(confettiTimer);
    };
  }, [isRedLabel]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0E1A] p-6 overflow-hidden">
      <style>{`
        @keyframes scan-again-glow {
          0%,100% { box-shadow: ${btnGlow}; }
          50%      { box-shadow: ${btnGlow.replace("0.4", "0.65")}; }
        }
      `}</style>

      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: bgGlow }} />

      {/* Animated content */}
      <div
        className="relative z-10 w-full max-w-xs text-center"
        style={{
          opacity:   visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.88) translateY(14px)",
          transition: "opacity 0.45s ease, transform 0.45s ease",
        }}
      >
        {/* Big emoji */}
        <p className="text-6xl mb-5" style={{ filter: `drop-shadow(0 0 18px ${accentGlow})` }}>
          {isRedLabel ? "🏷️" : "🎉"}
        </p>

        {/* Headline */}
        <p className="text-3xl font-extrabold text-white mb-2" style={{ letterSpacing: "-0.5px" }}>
          Nice! 🎉
        </p>

        {/* Ticket reward */}
        <p
          className="text-xl font-bold mb-2"
          style={{ color: accentColor, textShadow: `0 0 16px ${accentGlow}` }}
        >
          +{tickets} ticket{tickets > 1 ? "s" : ""} added
        </p>

        {/* Streak badge — appears from 2nd scan onward */}
        {streak >= 2 && (
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4 text-sm font-bold text-amber-300"
            style={{
              background: "rgba(255,183,0,0.12)",
              border: "1px solid rgba(255,183,0,0.25)",
              textShadow: "0 0 10px rgba(255,183,0,0.5)",
            }}
          >
            🔥 Streak ×{streak}
          </div>
        )}

        <div className={streak >= 2 ? "" : "mt-4"} />

        {/* Primary CTA — Scan Again */}
        <button
          onClick={onScanAgain}
          className="w-full py-[17px] rounded-2xl font-bold text-base text-white mb-3"
          style={{
            background: btnGradient,
            animation: "scan-again-glow 2.2s ease-in-out infinite",
          }}
        >
          Scan Again
        </button>

        {/* Secondary — Done */}
        <button
          onClick={onClose}
          className="w-full py-2.5 text-sm font-medium rounded-xl"
          style={{ color: "rgba(255,255,255,0.32)" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
