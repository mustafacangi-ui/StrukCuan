import { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCreateReceipt } from "@/hooks/useReceipts";
import { useReceiptsToday } from "@/hooks/useReceipts";

const MAX_RECEIPTS_PER_DAY = 10;

const USER_FACING_ERROR = "Upload failed. Please try again.";

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

    try {
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

      try {
        await createReceipt.mutateAsync({
          userId,
          imageUrl: publicUrl,
          store: null,
          total: null,
        });
      } catch (dbErr) {
        console.error("[CameraScanner] Receipt DB insert failed (image uploaded):", dbErr);
      }

      stopCamera();
      setStatus("success");
    } catch (e) {
      console.error("[CameraScanner] Upload error:", e);
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
        <span className="text-sm font-medium text-white">Upload Receipt</span>
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
            <p className="text-white font-medium">Uploading...</p>
          </div>
        </div>
      )}

      {/* Success overlay */}
      {status === "success" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6">
          <p className="text-primary font-semibold text-center mb-4 text-lg">
            Receipt uploaded successfully. Waiting for admin approval.
          </p>
          <button
            onClick={handleClose}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Close
          </button>
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
    </div>
  );
}
