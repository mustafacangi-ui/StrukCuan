import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCreateReceipt, useReceiptsToday, fetchReceiptsTodayCount, isDailyLimitError, DAILY_LIMIT_ERROR } from "@/hooks/useReceipts";
import { DAILY_RECEIPT_LIMIT, getRemainingReceiptsToday } from "@/hooks/useUploadLimits";
import RewardPopup from "@/components/RewardPopup";
import { Camera, ArrowLeft, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png)$/i;

function getFileExtension(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  return "jpg";
}

function sanitizeStoragePath(userId: string, file: File): string {
  const ext = getFileExtension(file.type);
  const safeName = `${Date.now()}.${ext}`;
  return `${userId}/${safeName}`;
}

export default function Upload() {
  const navigate = useNavigate();
  const { user, isOnboarded, isLoading } = useUser();
  const createReceipt = useCreateReceipt();
  const userId = user?.id;
  const { data: todayCount = 0 } = useReceiptsToday(userId ?? undefined);

  const [step, setStep] = useState<"camera" | "preview" | "submit">("camera");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/home", { replace: true, state: { requireLogin: "camera" as const } });
      return;
    }
    if (!isOnboarded) {
      navigate("/onboarding", { replace: true });
    }
  }, [isLoading, user, isOnboarded, navigate]);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  useEffect(() => {
    return () => revokePreviewUrl();
  }, [revokePreviewUrl]);

  const validateFile = useCallback((file: File): string | null => {
    const isAcceptedType = ACCEPTED_TYPES.includes(file.type) ||
      ACCEPTED_EXTENSIONS.test(file.name);
    if (!isAcceptedType) {
      return "Only JPG or PNG files are accepted";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Max file size is 5MB";
    }
    if (file.size === 0) {
      return "Empty file. Try taking the photo again.";
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateFile(file);
    if (err) {
      setError(err);
      e.target.value = "";
      return;
    }

    revokePreviewUrl();
    const url = URL.createObjectURL(file);
    setImage(file);
    setPreviewUrl(url);
    setStep("preview");
    e.target.value = "";
  }, [validateFile, revokePreviewUrl]);

  const handleRetake = useCallback(() => {
    revokePreviewUrl();
    setImage(null);
    setPreviewUrl(null);
    setError(null);
    setStep("camera");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [revokePreviewUrl]);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!userId) {
      setError("Session expired. Please log in again.");
      return;
    }

    if (!image) {
      setError("Please take a receipt photo first");
      return;
    }

    if (submitLockRef.current) return;
    submitLockRef.current = true;

    try {
      const freshCount = await fetchReceiptsTodayCount(userId);
      if (freshCount >= DAILY_RECEIPT_LIMIT) {
        submitLockRef.current = false;
        setError(DAILY_LIMIT_ERROR);
        return;
      }

      const storagePath = sanitizeStoragePath(userId, image);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(storagePath, image, {
          upsert: false,
          contentType: image.type,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        if (uploadError.message?.includes("duplicate") || uploadError.message?.includes("already exists")) {
          setError("File already exists. Try a new photo.");
        } else if (uploadError.message?.includes("size") || uploadError.message?.includes("limit")) {
          setError("File too large. Max 5MB.");
        } else {
          setError("Gagal mengunggah struk. Coba lagi.");
        }
        return;
      }

      if (!uploadData?.path) {
        setError("Gagal mengunggah struk. Coba lagi.");
        return;
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
        console.error("[Upload] Receipt DB insert failed (image uploaded):", dbErr);
        if (isDailyLimitError(dbErr)) {
          setError(DAILY_LIMIT_ERROR);
          return;
        }
        setError((dbErr as Error)?.message ?? "Upload failed. Please try again.");
        return;
      }

      handleRetake();
      setShowReward(true);
    } catch (e) {
      if (isDailyLimitError(e)) {
        setError(DAILY_LIMIT_ERROR);
      } else {
        setError((e as Error)?.message ?? "Upload failed. Please try again.");
      }
    } finally {
      submitLockRef.current = false;
    }
  }, [userId, image, createReceipt, handleRetake]);

  if (!isLoading && (!user || !isOnboarded)) return null;

  return (
    <div className="min-h-screen max-w-[420px] mx-auto pb-28">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full bg-secondary p-2"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">
          Upload Receipt
        </h1>
      </div>

      <div className="mx-4 mt-6">
        {isLoading ? (
          <div className="flex flex-col items-center">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-4 w-48 mt-4" />
            <Skeleton className="h-3 w-36 mt-2" />
          </div>
        ) : step === "camera" ? (
          <div className="flex flex-col items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-32 w-32 items-center justify-center rounded-full bg-primary shadow-primary"
            >
              <Camera size={48} className="text-primary-foreground" />
            </button>
            <p className="mt-4 text-sm text-muted-foreground text-center">
              Take a receipt photo or choose from gallery
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground/80">
              JPG/PNG max 5MB · Max 3 receipts/day
            </p>
          </div>
        ) : step === "preview" && previewUrl ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <img
                src={previewUrl}
                alt="Preview struk"
                className="w-full h-auto block"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRetake}
                className="flex-1 rounded-lg border border-border bg-secondary py-2.5 text-sm font-medium"
              >
                <X size={16} className="inline mr-1" />
                Retake
              </button>
              <button
                onClick={handleSubmit}
                disabled={createReceipt.isPending || todayCount >= DAILY_RECEIPT_LIMIT}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {createReceipt.isPending ? "Sending..." : todayCount >= DAILY_RECEIPT_LIMIT ? (
                  DAILY_LIMIT_ERROR
                ) : (
                  <>
                    <Check size={16} className="inline mr-1" />
                    Submit ({getRemainingReceiptsToday(todayCount)} left)
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}

        {showReward && (
          <RewardPopup onClose={() => setShowReward(false)} />
        )}
        {error && (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
