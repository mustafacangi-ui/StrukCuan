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

const MAX_RECEIPTS_PER_DAY = 3;

const USER_FACING_ERROR = "Upload failed. Please try again.";

const RECEIPT_RULES = `Rules:
• Only supermarket receipts
• Receipt must be from today
• Maximum 3 receipts per day`;

const RED_LABEL_RULES = `Kırmızı Etiket (Red Label):
• Photo of discounted product
• Will appear on the map for others`;

const UPLOAD_CONSENT = "By uploading a receipt you allow StrukCuan to review and store it for verification.";
const FRAUD_WARNING = "Uploading fake or duplicated receipts may result in account suspension.";

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
  const { data: todayCount = 0 } = useReceiptsToday(user?.id ?? undefined);

  const isRedLabel = mode === "red_label";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<"camera" | "preview" | "form" | "processing" | "success" | "error">("camera");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redLabelForm, setRedLabelForm] = useState({ product_name: "", price: "", store: "", discount: "" });

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

    if (!isRedLabel && todayCount >= MAX_RECEIPTS_PER_DAY) {
      setError(`Max ${MAX_RECEIPTS_PER_DAY} receipts per day.`);
      setStep("error");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
      setStep(isRedLabel ? "form" : "preview");
    }, "image/jpeg", 0.9);
  }, [userId, todayCount, stopCamera, isRedLabel]);

  const handleRetake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setError(null);
    setStep("camera");
  }, [previewUrl]);

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

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCapturedBlob(null);
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
  }, [capturedBlob, userId, todayCount, createReceipt, previewUrl]);

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
      });
      console.log("[RedLabel] 7. deals insert OK");

      console.log("[RedLabel] 8. grantDealTickets RPC çağrılıyor");
      await grantDealTickets();
      console.log("[RedLabel] 9. grantDealTickets OK - tamamlandı");
      queryClient.invalidateQueries({ queryKey: USER_TICKETS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["user_stats"] });
      toast.success("Tebrikler! 2 bilet kazandınız.");

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCapturedBlob(null);
      setRedLabelForm({ product_name: "", price: "", store: "", discount: "" });
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
  }, [capturedBlob, userId, redLabelForm, createDeal, location, previewUrl, queryClient]);

  const handleSubmit = isRedLabel ? handleSubmitRedLabel : handleSubmitReceipt;

  const handleClose = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    stopCamera();
    onClose();
  }, [stopCamera, onClose, previewUrl]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera preview */}
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
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-black/40">
            <button
              onClick={handleClose}
              className="rounded-full bg-black/50 p-2 text-white"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <span className="text-sm font-medium text-white">Take Photo</span>
            <div className="w-10" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-10">
            <div className="mb-4 space-y-2">
              <pre className="rounded-lg bg-black/60 p-3 text-[10px] text-white/90 whitespace-pre-wrap">
                {isRedLabel ? RED_LABEL_RULES : RECEIPT_RULES}
              </pre>
              <p className="rounded-lg bg-black/60 p-2.5 text-[10px] text-white/80">
                {UPLOAD_CONSENT}
              </p>
              <p className="rounded-lg bg-amber-500/20 border border-amber-500/40 p-2.5 text-[10px] text-amber-200">
                ⚠ {FRAUD_WARNING}
              </p>
            </div>
            <button
              onClick={handleCapture}
              disabled={!isRedLabel && todayCount >= MAX_RECEIPTS_PER_DAY}
              className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-white disabled:opacity-50"
            >
              <Camera size={32} className="text-black" />
            </button>
          </div>
        </>
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
              Haritaya Ekle (+2 Bilet)
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
            <span className="text-sm font-medium text-white">Preview</span>
            <button
              onClick={handleClose}
              className="rounded-full bg-black/50 p-2 text-white"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-3 p-4 pb-10">
            <p className="text-[10px] text-white/80 text-center">
              {UPLOAD_CONSENT}
            </p>
            <p className="text-[10px] text-amber-200 text-center">
              ⚠ {FRAUD_WARNING}
            </p>
            <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 rounded-xl border border-white/40 bg-black/50 py-3 text-sm font-medium text-white"
            >
              Retake
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
            >
              Submit
            </button>
            </div>
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
        <SuccessCelebration onClose={handleClose} isRedLabel={isRedLabel} />
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

function SuccessCelebration({ onClose, isRedLabel }: { onClose: () => void; isRedLabel?: boolean }) {
  useEffect(() => {
    if (isRedLabel) {
      const colors = ["#FF3B3B", "#FF6B6B", "#FFD166", "#FFE066", "#FFFFFF"];
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors,
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
      }, 200);
    }
    const id = setTimeout(onClose, 2500);
    return () => clearTimeout(id);
  }, [onClose, isRedLabel]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-yellow-300 animate-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: "-10px",
              animationDelay: `${Math.random() * 0.5}s`,
              animationDuration: `${1.5 + Math.random()}s`,
            }}
          />
        ))}
      </div>
      <div className="relative z-10 text-center max-w-sm">
        <p className="text-2xl mb-2">{isRedLabel ? "🏷️" : "✨"}</p>
        <p className="text-lg font-bold text-white mb-2">
          {isRedLabel ? "Kırmızı Etiket paylaşıldı!" : "Receipt received!"}
        </p>
        <p className="text-sm text-white/90">
          {isRedLabel
            ? "Haritada görünecek. +2 bilet kazandınız!"
            : "It is being reviewed. Your ticket and cuan will be added soon."}
        </p>
      </div>
    </div>
  );
}
