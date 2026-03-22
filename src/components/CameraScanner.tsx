import { useState, useRef, useEffect, useCallback } from "react";
import confetti from "canvas-confetti";
import { X, Camera, RotateCcw, Receipt, Tag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCreateReceipt, useReceiptsToday, RECEIPTS_QUERY_KEY, fetchReceiptsTodayCount, isDailyLimitError, DAILY_LIMIT_ERROR } from "@/hooks/useReceipts";
import { useCreateDeal } from "@/hooks/useCreateDeal";
import { useUserLocation } from "@/hooks/useUserLocation";
import { grantDealTickets } from "@/hooks/useGrantDealTickets";
import { useQueryClient } from "@tanstack/react-query";
import { USER_TICKETS_QUERY_KEY } from "@/hooks/useUserTickets";
import { toast } from "sonner";
import { hashBlob, wasDuplicateToday, markHashUsed } from "@/lib/imageHash";
import {
  useRedLabelsToday,
  MAX_RED_LABELS_PER_DAY,
  DAILY_RECEIPT_LIMIT,
  getReceiptTicketsForScan,
  getRemainingReceiptsToday,
  RED_LABELS_TODAY_KEY,
} from "@/hooks/useUploadLimits";

const USER_FACING_ERROR = "Upload failed. Please try again.";

export type CameraMode = "receipt" | "red_label";

type ScanStep =
  | "select"      // NEW — pre-scan type selection (always shown first)
  | "camera"      // viewfinder
  | "preview"     // receipt confirm
  | "form"        // red-label detail form
  | "processing"
  | "success"
  | "error";

interface CameraScannerProps {
  onClose: () => void;
  /**
   * If provided, skips the pre-scan selection screen and opens
   * the camera directly in this mode (e.g. from the Radar/Map page).
   * If omitted, the selection screen is shown first.
   */
  mode?: CameraMode;
}

export default function CameraScanner({ onClose, mode }: CameraScannerProps) {
  const { user } = useUser();
  const createReceipt = useCreateReceipt();
  const createDeal = useCreateDeal();
  const queryClient = useQueryClient();
  const { location, error: locationError } = useUserLocation();
  const { data: todayCount = 0 }        = useReceiptsToday(user?.id ?? undefined);
  const { data: redLabelTodayCount = 0 } = useRedLabelsToday(user?.id ?? undefined);

  const videoRef       = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const submitLockRef = useRef(false);

  // Start on the pre-scan select screen unless a mode was explicitly given
  const [step, setStep] = useState<ScanStep>(mode ? "camera" : "select");
  // Which type the user has chosen (pre-scan selection or prop)
  const [selectedType, setSelectedType] = useState<CameraMode>(mode ?? "receipt");
  const isRedLabel = selectedType === "red_label";

  const [previewUrl, setPreviewUrl]     = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [redLabelForm, setRedLabelForm] = useState({
    product_name: "",
    price: "",
    store: "",
    discount: "",
  });
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [scanStreak, setScanStreak]   = useState(0);
  // Tracks how many tickets were actually awarded for the success screen
  const [ticketsAwarded, setTicketsAwarded] = useState(0);

  const userId = user?.id;

  // ── Receipt ticket schedule (+1 per scan, 0 after limit) ─────────────────
  const nextReceiptTickets   = getReceiptTicketsForScan(todayCount); // tickets THIS scan will earn
  const receiptAtTicketLimit = nextReceiptTickets === 0;             // canonical: true whenever 0 tickets

  // Force-refresh todayCount when select screen is shown (avoid stale data)
  useEffect(() => {
    if (step === "select" && userId) {
      queryClient.refetchQueries({ queryKey: [...RECEIPTS_QUERY_KEY, "today", userId] });
    }
  }, [step, userId, queryClient]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Start/stop camera only when step === "camera"
  useEffect(() => {
    let mounted = true;
    if (step !== "camera") return;

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
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        console.error("Camera error:", e);
        if (mounted) {
          setError("Cannot access camera. Please allow camera permission.");
          setStep("error");
        }
      }
    };

    startCamera();
    return () => {
      mounted = false;
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Pre-scan type selection (Issue 1) ────────────────────────────────────
  const handleSelectTypePre = useCallback((type: CameraMode) => {
    if (type === "receipt" && nextReceiptTickets === 0) return;
    if (type === "red_label" && redLabelTodayCount >= MAX_RED_LABELS_PER_DAY) {
      toast.error(`Daily red label limit reached (max ${MAX_RED_LABELS_PER_DAY} per day)`);
      return;
    }
    setSelectedType(type);
    setStep("camera");
  }, [nextReceiptTickets, redLabelTodayCount]);

  // ── Capture — hash check, then go straight to preview/form ───────────────
  const handleCapture = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !userId) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

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
      // Since type is already chosen, skip the post-capture "type" screen
      setStep(selectedType === "red_label" ? "form" : "preview");
    }, "image/jpeg", 0.9);
  }, [userId, stopCamera, selectedType]);

  const handleRetake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setPendingHash(null);
    setError(null);
    setStep("camera");
  }, [previewUrl]);

  const handleScanAgain = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setPendingHash(null);
    setError(null);
    // Go back to select screen so user can choose type again
    setSelectedType(mode ?? "receipt");
    setStep(mode ? "camera" : "select");
  }, [previewUrl, mode]);

  // ── Receipt submit (Issue 2: daily ticket cap) ────────────────────────────
  const handleSubmitReceipt = useCallback(async () => {
    if (!capturedBlob || !userId) return;
    if (nextReceiptTickets === 0) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setStep("processing");
    setError(null);

    try {
      // Server-side validation: fetch fresh count before upload (prevents race/stale bypass)
      const freshCount = await fetchReceiptsTodayCount(String(userId));
      if (freshCount >= DAILY_RECEIPT_LIMIT) {
        submitLockRef.current = false;
        toast.error(DAILY_LIMIT_ERROR);
        setStep("preview");
        return;
      }

      const earnedTickets = getReceiptTicketsForScan(freshCount);
      if (earnedTickets === 0) {
        submitLockRef.current = false;
        toast.error(DAILY_LIMIT_ERROR);
        setStep("preview");
        return;
      }

      const file        = new File([capturedBlob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
      const storagePath = `${String(userId)}/${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(storagePath, file, { upsert: false, contentType: "image/jpeg" });

      if (uploadError || !uploadData?.path) {
        throw new Error(`Upload failed: ${uploadError?.message ?? "Upload path missing"}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(uploadData.path);

      const receiptIndexToday = freshCount + 1;

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
        if (isDailyLimitError(dbErr)) {
          toast.error(DAILY_LIMIT_ERROR);
          setStep("preview");
          return;
        }
        throw dbErr;
      }

      if (userId && pendingHash) markHashUsed(String(userId), pendingHash);
      setPendingHash(null);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCapturedBlob(null);

      setTicketsAwarded(earnedTickets);
      if (earnedTickets > 0) {
        toast.success(`You earned +${earnedTickets} ticket${earnedTickets !== 1 ? "s" : ""} 🎉`);
        setScanStreak((s) => s + 1);
      } else {
        toast.info("Scan received! Daily ticket limit reached (0 tickets today)");
      }
      setStep("success");
    } catch (e) {
      const err = e as Error;
      console.error("[CameraScanner] Receipt upload error:", err);
      if (isDailyLimitError(e)) {
        toast.error(DAILY_LIMIT_ERROR);
        setStep("preview");
      } else {
        setError(USER_FACING_ERROR);
        setStep("error");
      }
    }
  }, [capturedBlob, userId, todayCount, pendingHash, createReceipt, previewUrl, nextReceiptTickets]);

  // ── Red Label submit ──────────────────────────────────────────────────────
  const handleSubmitRedLabel = useCallback(async () => {
    if (!capturedBlob || !userId) return;
    const { product_name, store, price, discount } = redLabelForm;
    if (!product_name.trim() || !store.trim()) {
      setError("Product name and store address are required.");
      return;
    }

    setStep("processing");
    setError(null);

    try {
      const file = new File([capturedBlob], `deal-${Date.now()}.jpg`, { type: "image/jpeg" });
      const storagePathDeals = `deals/${String(userId)}/${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(storagePathDeals, file, { upsert: false, contentType: "image/jpeg" });

      if (uploadError || !uploadData?.path) {
        throw new Error(`Upload failed: ${uploadError?.message ?? "Upload path missing"}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(uploadData.path);

      const discountNum   = discount ? parseInt(discount, 10) : undefined;
      const priceNum      = price ? parseInt(price.replace(/\D/g, ""), 10) : undefined;
      const expiry        = new Date();
      expiry.setDate(expiry.getDate() + 7);
      const isRedLabelFlag = (discountNum ?? 0) >= 50;

      const lat = Number(location?.lat);
      const lng = Number(location?.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setError("Location unavailable. Please enable GPS permission.");
        setStep("error");
        return;
      }

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

      await grantDealTickets();
      queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      queryClient.invalidateQueries({ queryKey: [...RED_LABELS_TODAY_KEY, userId] });
      toast.success("You earned +3 tickets 🔥");

      if (userId && pendingHash) markHashUsed(String(userId), pendingHash);
      setPendingHash(null);

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCapturedBlob(null);
      setRedLabelForm({ product_name: "", price: "", store: "", discount: "" });
      setTicketsAwarded(3);
      setScanStreak((s) => s + 1);
      setStep("success");
    } catch (e) {
      console.error("[CameraScanner] Red Label upload error:", e);
      setError(USER_FACING_ERROR);
      setStep("error");
    }
  }, [capturedBlob, userId, pendingHash, redLabelForm, createDeal, location, previewUrl, queryClient]);

  const handleClose = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    stopCamera();
    onClose();
  }, [stopCamera, onClose, previewUrl]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <canvas ref={canvasRef} className="hidden" />

      {/* ── PRE-SCAN TYPE SELECTION (Issue 1) ─────────────────────────── */}
      {step === "select" && (
        <div className="absolute inset-0 flex flex-col bg-[#0A0E1A]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <button
              onClick={handleClose}
              className="rounded-full bg-white/10 p-2 text-white"
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <span className="text-sm font-semibold text-white">What are you scanning?</span>
            <div className="w-10" />
          </div>

          {/* Options */}
          <div className="flex-1 flex flex-col justify-center px-6 gap-5">
            {/* Option A — Normal Receipt */}
            <button
              onClick={() => handleSelectTypePre("receipt")}
              disabled={receiptAtTicketLimit}
              className="w-full rounded-2xl border p-5 text-left transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: receiptAtTicketLimit
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(0,230,118,0.05)",
                border: receiptAtTicketLimit
                  ? "1px solid rgba(255,255,255,0.1)"
                  : "1px solid rgba(0,230,118,0.25)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(0,230,118,0.12)" }}
                  >
                    <Receipt size={22} className="text-[#00E676]" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-[15px]">Normal Grocery Receipt</p>
                    <p className="text-xs text-white/50 mt-0.5">Any supermarket or store receipt</p>
                  </div>
                </div>
                <span
                  className="text-xs font-bold rounded-full px-3 py-1.5 ml-2 shrink-0"
                  style={
                    receiptAtTicketLimit
                      ? { background: "rgba(255,183,0,0.1)", color: "#FFB700", border: "1px solid rgba(255,183,0,0.25)" }
                      : { background: "rgba(0,230,118,0.12)", color: "#00E676", border: "1px solid rgba(0,230,118,0.3)" }
                  }
                >
                  {receiptAtTicketLimit ? "0 tickets" : `+${nextReceiptTickets} ticket${nextReceiptTickets !== 1 ? "s" : ""}`}
                </span>
              </div>
              {receiptAtTicketLimit ? (
                <p className="text-[11px] text-amber-400/80 mt-1 ml-1">
                  {DAILY_LIMIT_ERROR}
                </p>
              ) : (
                <p className="text-[11px] text-[#00E676]/60 mt-1 ml-1">
                  {getRemainingReceiptsToday(todayCount)} left today — earn +1 ticket
                </p>
              )}
            </button>

            {/* Option B — Red Label */}
            <button
              onClick={() => handleSelectTypePre("red_label")}
              disabled={redLabelTodayCount >= MAX_RED_LABELS_PER_DAY}
              className="w-full rounded-2xl border p-5 text-left transition-all active:scale-[0.98] disabled:opacity-40"
              style={{
                background: "rgba(255,68,68,0.05)",
                border: "1px solid rgba(255,68,68,0.25)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,68,68,0.12)" }}
                  >
                    <Tag size={22} className="text-[#ff7070]" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-[15px]">Red Label / Local Discount</p>
                    <p className="text-xs text-white/50 mt-0.5">Special sale, price-off label</p>
                  </div>
                </div>
                <span
                  className="text-xs font-bold rounded-full px-3 py-1.5 ml-2 shrink-0"
                  style={{
                    background: "rgba(255,68,68,0.15)",
                    color: "#ff7070",
                    border: "1px solid rgba(255,68,68,0.3)",
                  }}
                >
                  +3 tickets
                </span>
              </div>
              {redLabelTodayCount >= MAX_RED_LABELS_PER_DAY ? (
                <p className="text-[11px] text-white/40 mt-1 ml-1">Daily limit reached</p>
              ) : (
                <p className="text-[11px] text-red-400/60 mt-1 ml-1">
                  {MAX_RED_LABELS_PER_DAY - redLabelTodayCount} scan{MAX_RED_LABELS_PER_DAY - redLabelTodayCount !== 1 ? "s" : ""} remaining today
                </p>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── CAMERA VIEWFINDER ─────────────────────────────────────────── */}
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
              onClick={() => setStep(mode ? "select" : "select")}
              className="rounded-full bg-black/50 p-2 text-white"
              aria-label="Back"
            >
              <X size={24} />
            </button>
            <span className="text-sm font-medium text-white">
              {isRedLabel ? "📍 Scan Red Label" : "🧾 Scan Receipt"}
            </span>
            <div className="w-10" />
          </div>

          {/* Shutter */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-center p-6 pb-12">
            <button
              onClick={handleCapture}
              className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-lg active:scale-95 transition-transform"
            >
              <Camera size={34} className="text-black" />
            </button>
          </div>
        </>
      )}

      {/* ── RECEIPT PREVIEW (Issue 3: hint text) ─────────────────────── */}
      {step === "preview" && previewUrl && !isRedLabel && (
        <>
          <div className="absolute inset-0 flex items-center justify-center bg-black p-4">
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="max-h-full max-w-full object-contain rounded-lg"
            />
          </div>

          {/* Top bar */}
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

          {/* Bottom actions */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-10 bg-black/40">
            {/* Issue 3: helpful hint text */}
            <p className="text-center text-xs text-white/50 mb-3">
              Check clarity before submitting.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 rounded-xl border border-white/20 bg-black/50 py-3.5 text-sm font-medium text-white"
              >
                Retake
              </button>
              <button
                onClick={handleSubmitReceipt}
                disabled={receiptAtTicketLimit || createReceipt.isPending}
                className="flex-1 rounded-xl py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: receiptAtTicketLimit
                    ? "linear-gradient(90deg,#3a3a3a,#555)"
                    : "linear-gradient(90deg,#00c853,#00E676)",
                  boxShadow: receiptAtTicketLimit
                    ? "none"
                    : "0 0 20px rgba(0,230,118,0.35)",
                }}
              >
                {receiptAtTicketLimit
                  ? DAILY_LIMIT_ERROR
                  : `Submit — +${nextReceiptTickets} ticket${nextReceiptTickets !== 1 ? "s" : ""} (${getRemainingReceiptsToday(todayCount)} left) 🎉`
                }
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── RED LABEL FORM ────────────────────────────────────────────── */}
      {step === "form" && previewUrl && isRedLabel && (
        <div className="absolute inset-0 flex flex-col bg-black overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="text-sm font-semibold text-white">Red Label Details</span>
            <button
              onClick={handleClose}
              className="rounded-full bg-black/50 p-2 text-white"
              aria-label="Close"
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
                ⚠ Location unavailable. The map will use a default position. You can still submit.
              </div>
            )}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Product name *"
                value={redLabelForm.product_name}
                onChange={(e) => setRedLabelForm((f) => ({ ...f, product_name: e.target.value }))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white placeholder:text-white/50"
              />
              <input
                type="text"
                placeholder="Store name / address *"
                value={redLabelForm.store}
                onChange={(e) => setRedLabelForm((f) => ({ ...f, store: e.target.value }))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white placeholder:text-white/50"
              />
              <input
                type="text"
                placeholder="Price (Rp)"
                value={redLabelForm.price}
                onChange={(e) => setRedLabelForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-white placeholder:text-white/50"
              />
              <input
                type="text"
                placeholder="Discount (%)"
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
              Retake
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

      {/* ── PROCESSING ────────────────────────────────────────────────── */}
      {step === "processing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
            <p className="text-white font-medium">Uploading...</p>
          </div>
        </div>
      )}

      {/* ── SUCCESS ────────────────────────────────────────────────────── */}
      {step === "success" && (
        <SuccessCelebration
          onClose={handleClose}
          onScanAgain={handleScanAgain}
          isRedLabel={isRedLabel}
          streak={scanStreak}
          ticketsAwarded={ticketsAwarded}
        />
      )}

      {/* ── ERROR ─────────────────────────────────────────────────────── */}
      {step === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0E1A] p-6">
          <p className="text-red-400 font-medium text-center mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setStep(mode ? "camera" : "select"); setError(null); }}
              className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white"
            >
              Try Again
            </button>
            <button
              onClick={handleClose}
              className="rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-sm font-bold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Success Celebration ────────────────────────────────────────────────────

interface SuccessCelebrationProps {
  onClose: () => void;
  onScanAgain: () => void;
  isRedLabel?: boolean;
  streak: number;
  ticketsAwarded: number;
}

function SuccessCelebration({
  onClose,
  onScanAgain,
  isRedLabel,
  streak,
  ticketsAwarded,
}: SuccessCelebrationProps) {
  const [visible, setVisible] = useState(false);
  const limitReached = !isRedLabel && ticketsAwarded === 0;

  const accentColor = limitReached
    ? "#FFB700"
    : isRedLabel ? "#ff7070" : "#00E676";
  const accentGlow = limitReached
    ? "rgba(255,183,0,0.4)"
    : isRedLabel ? "rgba(255,68,68,0.5)" : "rgba(0,230,118,0.5)";
  const btnGradient = limitReached
    ? "linear-gradient(90deg,#5a4200,#7a5a00)"
    : isRedLabel
      ? "linear-gradient(90deg,#e53935,#ff4ecd)"
      : "linear-gradient(90deg,#00c853,#00E676)";
  const btnGlow = limitReached
    ? "0 0 20px rgba(255,183,0,0.3), 0 4px 20px rgba(0,0,0,0.5)"
    : isRedLabel
      ? "0 0 30px rgba(229,57,53,0.4), 0 4px 20px rgba(0,0,0,0.5)"
      : "0 0 30px rgba(0,200,83,0.4), 0 4px 20px rgba(0,0,0,0.5)";
  const bgGlow = limitReached
    ? "radial-gradient(ellipse 70% 45% at 50% 35%, rgba(255,183,0,0.08), transparent)"
    : isRedLabel
      ? "radial-gradient(ellipse 70% 45% at 50% 35%, rgba(255,68,68,0.13), transparent)"
      : "radial-gradient(ellipse 70% 45% at 50% 35%, rgba(0,230,118,0.11), transparent)";

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 120);

    const confettiTimer = setTimeout(() => {
      if (limitReached) return; // no confetti when 0 tickets

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
  }, [isRedLabel, limitReached]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0E1A] p-6 overflow-hidden">
      <style>{`
        @keyframes scan-again-glow {
          0%,100% { box-shadow: ${btnGlow}; }
          50%      { box-shadow: ${btnGlow.replace("0.4", "0.65").replace("0.3", "0.5")}; }
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
          {limitReached ? "📋" : isRedLabel ? "🏷️" : "🎉"}
        </p>

        {/* Headline */}
        <p className="text-3xl font-extrabold text-white mb-2" style={{ letterSpacing: "-0.5px" }}>
          {limitReached ? "Scan Received!" : "Nice! 🎉"}
        </p>

        {/* Ticket reward / limit message */}
        <p
          className="text-xl font-bold mb-2"
          style={{ color: accentColor, textShadow: `0 0 16px ${accentGlow}` }}
        >
          {limitReached
            ? "Daily Limit Reached"
            : `+${ticketsAwarded} ticket${ticketsAwarded !== 1 ? "s" : ""} added`}
        </p>

        {/* Daily limit explanation */}
        {limitReached && (
          <p className="text-sm text-white/50 mb-4 leading-relaxed">
            You've reached {DAILY_RECEIPT_LIMIT} receipt tickets today.
            <br />
            Come back tomorrow for more!
          </p>
        )}

        {/* Streak badge — only when tickets are earned */}
        {!limitReached && streak >= 2 && (
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

        <div className={(!limitReached && streak >= 2) ? "" : "mt-4"} />

        {/* Primary CTA */}
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
