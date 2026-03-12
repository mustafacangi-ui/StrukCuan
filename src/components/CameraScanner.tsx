import { useState, useRef, useEffect, useCallback } from "react";
import { createWorker, PSM } from "tesseract.js";
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
  /carrefour/i,
  /lidl/i,
  /aldi/i,
  /tesco/i,
  /dm\s*-?\s*drogerie/i,
  /dm\s+markt/i,
  /drogerie\s*markt/i,
  /supermarket/i,
];

const PRICE_PATTERNS = [
  /(?:total|grand\s*total|total\s*pembayaran|sum|amount\s*due)[\s:]*rp\.?\s*([\d.,]+)/i,
  /(?:gesamt|summe|betrag|total|grand\s*total|sum)[\s:]*€?\s*([\d.,]+)/i,
  /(?:total|amount)[\s:]*\$?\s*([\d.,]+)/i,
  /rp\.?\s*([\d.,]+)\s*$/im,
  /€\s*([\d.,]+)\s*$/im,
  /\$\s*([\d.,]+)\s*$/im,
  /(?:total|jumlah)[\s:]*([\d.,]+)/i,
  /([\d.,]+)\s*(?:rupiah|rb|ribu|eur|usd)/i,
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
      if (/carrefour/i.test(found)) return "Carrefour";
      if (/lidl/i.test(found)) return "Lidl";
      if (/aldi/i.test(found)) return "Aldi";
      if (/dm\s*-?\s*drogerie|dm\s+markt|drogerie\s*markt/i.test(found)) return "DM";
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

type PreprocessMode = "full" | "highContrast" | "grayscaleOnly";

function applyPreprocess(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: PreprocessMode
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const contrast = mode === "highContrast" ? 1.8 : mode === "full" ? 1.56 : 1;
  const brightness = mode === "grayscaleOnly" ? 0 : 10;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const adjusted = Math.min(255, Math.max(0, (gray - 128) * contrast + 128 + brightness));
    data[i] = data[i + 1] = data[i + 2] = adjusted;
  }

  if (mode === "grayscaleOnly") {
    ctx.putImageData(imageData, 0, 0);
    return;
  }

  const grayPixels: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    grayPixels.push(data[i]);
  }

  const medianFiltered = new Float32Array(grayPixels.length);
  const pad = 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const neighbors: number[] = [];
      for (let dy = -pad; dy <= pad; dy++) {
        for (let dx = -pad; dx <= pad; dx++) {
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          neighbors.push(grayPixels[ny * width + nx]);
        }
      }
      neighbors.sort((a, b) => a - b);
      medianFiltered[y * width + x] = neighbors[Math.floor(neighbors.length / 2)];
    }
  }

  const blockSize = 31;
  const halfBlock = Math.floor(blockSize / 2);
  const C = 10;
  const binary = new Uint8Array(grayPixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let by = Math.max(0, y - halfBlock); by <= Math.min(height - 1, y + halfBlock); by++) {
        for (let bx = Math.max(0, x - halfBlock); bx <= Math.min(width - 1, x + halfBlock); bx++) {
          sum += medianFiltered[by * width + bx];
          count++;
        }
      }
      const mean = sum / count;
      const pixel = medianFiltered[y * width + x];
      binary[y * width + x] = pixel > mean - C ? 255 : 0;
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    const v = binary[Math.floor(i / 4)];
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
}

function isCanvasEmptyOrCorrupted(imageData: ImageData): boolean {
  const data = imageData.data;
  let sum = 0;
  let variance = 0;
  const samples: number[] = [];
  for (let i = 0; i < data.length; i += 16) {
    const g = data[i];
    sum += g;
    samples.push(g);
  }
  const mean = sum / samples.length;
  for (const g of samples) {
    variance += (g - mean) ** 2;
  }
  variance /= samples.length;
  return variance < 100 || (mean < 5) || (mean > 250);
}

const USER_FACING_ERROR = "Scan failed. Please ensure the receipt is flat and well-lit.";

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
          setError("Cannot access camera");
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
      setError(`Max ${MAX_RECEIPTS_PER_DAY} receipts per day.`);
      setStatus("error");
      return;
    }

    setStatus("processing");
    setError(null);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("[CameraScanner] Canvas context unavailable");
      setError(USER_FACING_ERROR);
      setStatus("error");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const rawImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const preprocessModes: PreprocessMode[] = ["full", "highContrast", "grayscaleOnly"];

    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
    try {
      try {
        worker = await createWorker("eng+deu", 1, { logger: () => {} });
      } catch (workerErr) {
        console.warn("[CameraScanner] Worker Init Failed (eng+deu), falling back to eng:", workerErr);
        worker = await createWorker("eng", 1, { logger: () => {} });
      }

      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });

      let bestText = "";
      let bestStore = "";
      let bestTotal: number | null = null;

      for (let attempt = 0; attempt < preprocessModes.length; attempt++) {
        try {
          ctx.putImageData(rawImageData, 0, 0);
          applyPreprocess(ctx, canvas.width, canvas.height, preprocessModes[attempt]);

          const processedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          if (isCanvasEmptyOrCorrupted(processedData)) {
            console.warn("[CameraScanner] Empty Canvas detected, using raw image for attempt", attempt + 1);
            ctx.putImageData(rawImageData, 0, 0);
            applyPreprocess(ctx, canvas.width, canvas.height, "grayscaleOnly");
          }

          const { data: { text } } = await worker.recognize(canvas);
          const store = extractStore(text) || "Store";
          const total = extractTotal(text);

          if (text.trim().length > bestText.trim().length) {
            bestText = text;
            bestStore = store;
            bestTotal = total;
          }

          if (store !== "Store" || total !== null) break;
        } catch (recErr) {
          console.warn(`[CameraScanner] Recognition attempt ${attempt + 1} failed:`, recErr);
        }
      }

      if (!bestText.trim()) {
        console.warn("[CameraScanner] Recognition Timeout or empty result");
      }

      if (bestTotal === null && bestText.trim().length > 0) {
        try {
          ctx.putImageData(rawImageData, 0, 0);
          applyPreprocess(ctx, canvas.width, canvas.height, "grayscaleOnly");
          await worker.setParameters({
            tessedit_pageseg_mode: PSM.AUTO,
            tessedit_char_whitelist: "0123456789.,€$Rp ",
          });
          const { data: { text } } = await worker.recognize(canvas);
          const priceRetry = extractTotal(text);
          if (priceRetry !== null) bestTotal = priceRetry;
        } catch (priceErr) {
          console.warn("[CameraScanner] Price retry with char_whitelist failed:", priceErr);
        }
      }

      const store = bestStore || "Store";
      const total = bestTotal;

      if (worker) {
        await worker.terminate();
        worker = null;
      }

      ctx.putImageData(rawImageData, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      if (!blob) {
        console.error("[CameraScanner] Failed to create image blob");
        throw new Error("Blob creation failed");
      }

      const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" });
      const storagePath = `${userId}/${Date.now()}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(storagePath, file, { upsert: false, contentType: "image/jpeg" });

      if (uploadError || !uploadData?.path) {
        console.error("[CameraScanner] Upload failed:", uploadError);
        throw new Error("Upload failed");
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
      if (worker) {
        try {
          await worker.terminate();
        } catch (_) {}
      }
      console.error("[CameraScanner] Scan error:", e);
      setError(USER_FACING_ERROR);
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

      {/* Ghost UI: prominent neon green frame */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="relative w-[85%] max-w-[340px] aspect-[3/4] rounded-2xl border-4 border-primary"
          style={{
            boxShadow: "0 0 32px hsl(150 100% 50% / 0.7), 0 0 64px hsl(150 100% 50% / 0.4), inset 0 0 24px hsl(150 100% 50% / 0.15)",
          }}
        >
          {/* Corner accents - more prominent */}
          <div className="absolute -top-1 -left-1 w-12 h-12 border-l-[5px] border-t-[5px] border-primary rounded-tl-xl" style={{ boxShadow: "0 0 20px hsl(150 100% 50% / 0.9)" }} />
          <div className="absolute -top-1 -right-1 w-12 h-12 border-r-[5px] border-t-[5px] border-primary rounded-tr-xl" style={{ boxShadow: "0 0 20px hsl(150 100% 50% / 0.9)" }} />
          <div className="absolute -bottom-1 -left-1 w-12 h-12 border-l-[5px] border-b-[5px] border-primary rounded-bl-xl" style={{ boxShadow: "0 0 20px hsl(150 100% 50% / 0.9)" }} />
          <div className="absolute -bottom-1 -right-1 w-12 h-12 border-r-[5px] border-b-[5px] border-primary rounded-br-xl" style={{ boxShadow: "0 0 20px hsl(150 100% 50% / 0.9)" }} />

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
          Align receipt within the frame
        </p>
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
        <span className="text-sm font-medium text-white">Scan Receipt</span>
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
            <p className="text-white font-medium">Scanning receipt...</p>
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
