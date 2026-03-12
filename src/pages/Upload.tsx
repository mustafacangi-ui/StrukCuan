import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCreateReceipt } from "@/hooks/useReceipts";
import { useReceiptsToday } from "@/hooks/useReceipts";
import RewardPopup from "@/components/RewardPopup";
import { Camera, ArrowLeft, Check, X } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png)$/i;
const MAX_RECEIPTS_PER_DAY = 10;

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
  const { data: todayCount = 0 } = useReceiptsToday(user?.id);

  const [step, setStep] = useState<"camera" | "preview" | "submit">("camera");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [store, setStore] = useState("");
  const [total, setTotal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = user?.id;

  useEffect(() => {
    if (isLoading) return;
    if (!isOnboarded) {
      navigate("/", { replace: true, state: { requireLogin: "camera" as const } });
    }
  }, [isLoading, isOnboarded, navigate]);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(id);
  }, [message]);

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
      return "Hanya file JPG atau PNG yang diterima";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Ukuran file maksimal 5MB";
    }
    if (file.size === 0) {
      return "File kosong. Coba ambil foto lagi.";
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
    setStore("");
    setTotal("");
    setError(null);
    setStep("camera");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [revokePreviewUrl]);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!userId) {
      setError("Sesi habis. Silakan login kembali.");
      return;
    }

    if (!image) {
      setError("Silakan ambil foto struk terlebih dahulu");
      return;
    }

    if (todayCount >= MAX_RECEIPTS_PER_DAY) {
      setError(`Maksimal ${MAX_RECEIPTS_PER_DAY} struk per hari. Coba lagi besok.`);
      return;
    }

    if (store.trim().length < 2) {
      setError("Masukkan nama toko (min. 2 karakter)");
      return;
    }

    const totalNumber = total
      ? Number(total) > 0
        ? Number(total)
        : null
      : null;

    const storagePath = sanitizeStoragePath(userId, image);

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(storagePath, image, {
          upsert: false,
          contentType: image.type,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        if (uploadError.message?.includes("duplicate") || uploadError.message?.includes("already exists")) {
          setError("File sudah ada. Coba ambil foto baru.");
        } else if (uploadError.message?.includes("size") || uploadError.message?.includes("limit")) {
          setError("Ukuran file terlalu besar. Maksimal 5MB.");
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

      await createReceipt.mutateAsync({
        userId,
        imageUrl: publicUrl,
        store: store.trim(),
        total: totalNumber,
      });

      handleRetake();
      setShowReward(true);
    } catch (e) {
      console.error("Receipt submit error:", e);
      const err = e as { message?: string };
      if (err?.message?.includes("duplicate") || err?.message?.includes("unique")) {
        setError("Struk ini sudah terkirim.");
      } else {
        setError("Terjadi kesalahan saat mengirim struk. Coba lagi.");
      }
    }
  }, [userId, image, store, total, todayCount, createReceipt, handleRetake]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-[420px] mx-auto flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }
  if (!isOnboarded) return null;

  return (
    <div className="min-h-screen bg-background max-w-[420px] mx-auto pb-28">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full bg-secondary p-2"
        >
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">
          Upload Struk
        </h1>
      </div>

      <div className="mx-4 mt-6">
        {step === "camera" && (
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
              Ambil foto struk belanja atau pilih dari galeri
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground/80">
              JPG/PNG max 5MB · Max 10 struk/hari
            </p>
          </div>
        )}

        {step === "preview" && previewUrl && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <img
                src={previewUrl}
                alt="Preview struk"
                className="w-full h-auto block"
              />
            </div>

            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none"
              placeholder="Nama toko (Indomaret / Alfamart)"
              value={store}
              onChange={(e) => setStore(e.target.value)}
            />

            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none"
              placeholder="Total (opsional)"
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                onClick={handleRetake}
                className="flex-1 rounded-lg border border-border bg-secondary py-2.5 text-sm font-medium"
              >
                <X size={16} className="inline mr-1" />
                Ambil Ulang
              </button>
              <button
                onClick={handleSubmit}
                disabled={createReceipt.isPending}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {createReceipt.isPending ? "Mengirim..." : (
                  <>
                    <Check size={16} className="inline mr-1" />
                    Kirim
                  </>
                )}
              </button>
            </div>
          </div>
        )}

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
