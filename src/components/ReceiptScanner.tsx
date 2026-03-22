import { useMemo, useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCreateReceipt, useReceiptsToday, fetchReceiptsTodayCount, isDailyLimitError, DAILY_LIMIT_ERROR } from "@/hooks/useReceipts";
import { DAILY_RECEIPT_LIMIT, getRemainingReceiptsToday } from "@/hooks/useUploadLimits";

export default function ReceiptScanner() {
  const { user, isOnboarded, requireLogin } = useUser();
  const createReceipt = useCreateReceipt();
  const userId = user?.id;
  const { data: todayCount = 0 } = useReceiptsToday(userId ?? undefined);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [store, setStore] = useState("");
  const [total, setTotal] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number | null>(null);
  const [highlight, setHighlight] = useState(false);

  const userId = user?.phone;

  const totalNumber = useMemo(() => {
    const n = Number(total);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [total]);

  const submit = async () => {
    setError(null);
    setMessage(null);

    if (lastSubmittedAt && Date.now() - lastSubmittedAt < 30_000) {
      setError("Kamu baru saja upload struk. Coba lagi sebentar lagi.");
      return;
    }
    if (!isOnboarded) {
      requireLogin("camera");
      return;
    }

    if (!userId) {
      setError("Missing user id");
      return;
    }

    if (!image) {
      setError("Please upload a receipt photo");
      return;
    }

    if (store.trim().length < 2) {
      setError("Please enter store name");
      return;
    }

    if (todayCount >= DAILY_RECEIPT_LIMIT) {
      setError(DAILY_LIMIT_ERROR);
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

      const fileName = `${userId}/${Date.now()}-${image.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, image, { upsert: false });

      if (uploadError || !uploadData?.path) {
        console.error(uploadError);
        setError("Receipt upload failed");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("receipts").getPublicUrl(uploadData.path);

      try {
        await createReceipt.mutateAsync({
          userId,
          imageUrl: publicUrl,
          store: store.trim(),
          total: totalNumber,
        });
      } catch (dbErr) {
        if (isDailyLimitError(dbErr)) {
          setError(DAILY_LIMIT_ERROR);
          return;
        }
        throw dbErr;
      }

      setLastSubmittedAt(Date.now());
      setMessage("Receipt submitted – waiting for admin approval");
      setStore("");
      setTotal("");
      setImage(null);
      setPreviewUrl(null);
    } catch (e) {
      console.error(e);
      setError("Something went wrong when submitting your receipt");
    } finally {
      submitLockRef.current = false;
    }
  };

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(id);
  }, [message]);

  useEffect(() => {
    const handler = () => {
      if (containerRef.current) {
        containerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        setHighlight(true);
        window.setTimeout(() => setHighlight(false), 1200);
      }
    };

    window.addEventListener("scroll-to-receipt-scanner", handler);
    return () => {
      window.removeEventListener("scroll-to-receipt-scanner", handler);
    };
  }, []);

  return (
    <div
      id="receipt-scanner"
      ref={containerRef}
      className={`mx-4 mt-4 rounded-xl border border-border bg-card p-4 transition-shadow transition-transform ${
        highlight ? "ring-2 ring-primary/60 shadow-[0_0_25px_rgba(74,222,128,0.5)] scale-[1.01]" : ""
      }`}
    >
      <h2 className="font-display text-sm font-bold text-foreground">
        Scan Receipt
      </h2>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Upload foto struk. Admin akan verifikasi. Jika disetujui kamu dapat +50
        cuan dan +1 tiket.
      </p>

      <div className="mt-3 space-y-2">
        <input
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          placeholder="Store (Indomaret / Alfamart)"
          value={store}
          onChange={(e) => setStore(e.target.value)}
        />

        <input
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          placeholder="Total (optional)"
          inputMode="decimal"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
        />

        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none"
          onChange={(e) => {
            setError(null);
            const file = e.target.files?.[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
              setError("File harus berupa gambar");
              return;
            }

            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
              setError("Max file size 5MB");
              return;
            }

            setImage(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
          }}
        />

        {previewUrl && (
          <div className="overflow-hidden rounded-lg border border-border bg-background">
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="w-full h-auto block"
            />
          </div>
        )}

        <button
          onClick={submit}
          disabled={createReceipt.isPending || todayCount >= DAILY_RECEIPT_LIMIT}
          className="w-full rounded-lg bg-primary py-2.5 font-display font-bold text-primary-foreground text-sm disabled:opacity-60"
        >
          {createReceipt.isPending ? "Uploading..." : todayCount >= DAILY_RECEIPT_LIMIT ? DAILY_LIMIT_ERROR : `Submit Receipt (${getRemainingReceiptsToday(todayCount)} left)`}
        </button>

        {message && (
          <p className="text-[10px] text-primary mt-1">{message}</p>
        )}
        {error && (
          <p className="text-[10px] text-neon-red mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}

