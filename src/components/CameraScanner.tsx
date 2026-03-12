import { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCreateReceipt } from "@/hooks/useReceipts";
import { useReceiptsToday } from "@/hooks/useReceipts";

const MAX_RECEIPTS_PER_DAY = 3;

const USER_FACING_ERROR = "Upload failed. Please try again.";

const RECEIPT_RULES = `Rules:
• Only supermarket receipts
• Receipt must be from today
• Maximum 3 receipts per day`;

const UPLOAD_CONSENT = "By uploading a receipt you allow StrukCuan to review and store it for verification.";
const FRAUD_WARNING = "Uploading fake or duplicated receipts may result in account suspension.";

interface CameraScannerProps {
  onClose: () => void;
}

export default function CameraScanner({ onClose }: CameraScannerProps) {
  const { user } = useUser();
  const createReceipt = useCreateReceipt();
  const { data: todayCount = 0 } = useReceiptsToday(user?.id ?? undefined);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<"camera" | "preview" | "processing" | "success" | "error">("camera");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    if (todayCount >= MAX_RECEIPTS_PER_DAY) {
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
      setStep("preview");
    }, "image/jpeg", 0.9);
  }, [userId, todayCount, stopCamera]);

  const handleRetake = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setError(null);
    setStep("camera");
  }, [previewUrl]);

  const handleSubmit = useCallback(async () => {
    if (!capturedBlob || !userId) return;

    setStep("processing");
    setError(null);

    try {
      const file = new File([capturedBlob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
      const storagePath = `${userId}/${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(storagePath, file, { upsert: false, contentType: "image/jpeg" });

      if (uploadError || !uploadData?.path) {
        throw new Error("Upload failed");
      }

      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(uploadData.path);

      const receiptIndexToday = todayCount + 1;

      try {
        await createReceipt.mutateAsync({
          userId,
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
      console.error("[CameraScanner] Upload error:", e);
      setError(USER_FACING_ERROR);
      setStep("error");
    }
  }, [capturedBlob, userId, todayCount, createReceipt, previewUrl]);

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
                {RECEIPT_RULES}
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
              disabled={todayCount >= MAX_RECEIPTS_PER_DAY}
              className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-white disabled:opacity-50"
            >
              <Camera size={32} className="text-black" />
            </button>
          </div>
        </>
      )}

      {/* Preview */}
      {step === "preview" && previewUrl && (
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
        <SuccessCelebration onClose={handleClose} />
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

function SuccessCelebration({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 2500);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-6 overflow-hidden">
      {/* Falling sparkles */}
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
        <p className="text-2xl mb-2">✨</p>
        <p className="text-lg font-bold text-white mb-2">Receipt received!</p>
        <p className="text-sm text-white/90">
          It is being reviewed. Your ticket and cuan will be added soon.
        </p>
      </div>
    </div>
  );
}
