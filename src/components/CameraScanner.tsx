import { useState, useRef, useEffect, useCallback } from "react";
import { createWorker } from "tesseract.js";
import { X, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCreateReceipt } from "@/hooks/useReceipts";
import { useReceiptsToday } from "@/hooks/useReceipts";
import RewardPopup from "@/components/RewardPopup";

const MAX_RECEIPTS_PER_DAY = 10;

const STORE_PATTERNS = [
  /indomaret/i,
  /alfamart/i,
  /alfamidi/i,
  /circle\s*k/i,
  /minimarket/i,
];

const PRICE_PATTERNS = [
  /(?:total|grand\s*total|total\s*pembayaran)[\s:]*rp\.?\s*([\d.,]+)/i,
  /rp\.?\s*([\d.,]+)\s*$/im,
  /(?:total|jumlah)[\s:]*([\d.,]+)/i,
  /([\d.,]+)\s*(?:rupiah|rb|ribu)/i,
];

function extractStore(text: string): string {
  for (const pattern of STORE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const found = match[0].trim();
      if (/indomaret/i.test(found)) return "Indomaret";
      if (/alfamart/i.test(found)) return "Alfamart";
      if (/alfamidi/i.test(found)) return "Alfamidi";
      if (/circle\s*k/i.test(found)) return "Circle K";
      return found;
    }
  }
  return "";
}

function extractTotal(text: string): number | null {
  for (const pattern of PRICE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const numStr = (match[1] ?? match[0]).replace(/\./g, "").replace(",", ".");
      const num = parseFloat(numStr);
      if (!isNaN(num) && num > 0 && num < 1e9) return Math.round(num);
    }
  }
  const rpMatch = text.match(/rp\.?\s*([\d.,]+)/gi);
  if (rpMatch?.length) {
    const last = rpMatch[rpMatch.length - 1];
    const numStr = last.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
    const num = parseFloat(numStr);
    if (!isNaN(num) && num > 100) return Math.round(num);
  }
  return null;
}

function imageToGrayscale(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
}

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

  const [status, setStatus] = useState<"camera" | "processing" | "success" | "error">("camera");
  const [error, setError] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);

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
          setError("Tidak dapat mengakses kamera");
          setStatus("error");
        }
      }
    };
    startCamera();
    return () => {
      mounted = false;
      stopCamera();
    };
  }, [stopCamera]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !userId || status !== "camera") return;

    if (todayCount >= MAX_RECEIPTS_PER_DAY) {
      setError(`Maksimal ${MAX_RECEIPTS_PER_DAY} struk per hari.`);
      setStatus("error");
      return;
    }

    setStatus("processing");
    setError(null);

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      imageToGrayscale(ctx, canvas.width, canvas.height);

      const worker = await createWorker("eng", 1, {
        logger: () => {},
      });
      const { data: { text } } = await worker.recognize(canvas);
      await worker.terminate();

      const store = extractStore(text) || "Toko";
      const total = extractTotal(text);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      if (!blob) throw new Error("Failed to create image blob");

      const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
      const storagePath = `${userId}/${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(storagePath, file, { upsert: false, contentType: "image/jpeg" });

      if (uploadError || !uploadData?.path) {
        throw new Error("Gagal mengunggah struk");
      }

      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(uploadData.path);

      await createReceipt.mutateAsync({
        userId,
        imageUrl: publicUrl,
        store,
        total,
      });

      stopCamera();
      setStatus("success");
      setShowReward(true);
    } catch (e) {
      console.error("Scan error:", e);
      setError(e instanceof Error ? e.message : "Gagal memindai struk");
      setStatus("error");
    }
  }, [userId, todayCount, status, createReceipt, stopCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
      </div>

      {/* Ghost UI: neon green frame */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="relative w-[85%] max-w-[340px] aspect-[3/4] rounded-xl border-2 border-primary/40"
          style={{
            boxShadow: "0 0 16px hsl(150 100% 50% / 0.5), inset 0 0 16px hsl(150 100% 50% / 0.1)",
          }}
        >
          {/* Corner accents */}
          <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-lg" style={{ boxShadow: "0 0 12px hsl(150 100% 50% / 0.8)" }} />
          <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-lg" style={{ boxShadow: "0 0 12px hsl(150 100% 50% / 0.8)" }} />
          <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-lg" style={{ boxShadow: "0 0 12px hsl(150 100% 50% / 0.8)" }} />
          <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-lg" style={{ boxShadow: "0 0 12px hsl(150 100% 50% / 0.8)" }} />

          {/* Laser scan line */}
          <div
            className="absolute left-0 right-0 h-0.5 bg-primary animate-scan-line pointer-events-none"
            style={{
              boxShadow: "0 0 16px hsl(150 100% 50% / 0.9)",
            }}
          />
        </div>
      </div>

      {/* Overlay text */}
      <div className="absolute top-4 left-4 right-4 text-center pointer-events-none">
        <p className="text-sm font-medium text-white drop-shadow-lg">
          Arahkan fiş ke dalam bingkai
        </p>
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-black/40">
        <button
          onClick={handleClose}
          className="rounded-full bg-black/50 p-2 text-white"
          aria-label="Tutup"
        >
          <X size={24} />
        </button>
        <span className="text-sm font-medium text-white">Pindai Struk</span>
        <div className="w-10" />
      </div>

      {/* Bottom capture button */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={handleCapture}
          disabled={status === "processing"}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-[0_0_24px_hsl(150_100%_50%_/_0.5)] disabled:opacity-50"
        >
          <Camera size={32} className="text-primary-foreground" />
        </button>
      </div>

      {/* Processing overlay */}
      {status === "processing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-white font-medium">Memindai struk...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6">
          <p className="text-destructive font-medium text-center mb-4">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => { setStatus("camera"); setError(null); }}
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium"
            >
              Coba Lagi
            </button>
            <button
              onClick={handleClose}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Success: RewardPopup */}
      {showReward && (
        <RewardPopup
          onClose={() => {
            setShowReward(false);
            handleClose();
          }}
        />
      )}
    </div>
  );
}
