import { useState, useRef } from "react";
import { Camera, MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/contexts/UserContext";
import { useUserLocation } from "@/hooks/useUserLocation";
import {
  useCreatePromo,
  fetchUserPromoCountToday,
  fetchLastPromoAtStore,
  MAX_PROMOS_PER_DAY,
  STORE_COOLDOWN_MINUTES,
} from "@/hooks/usePromos";
import { supabase } from "@/lib/supabase";

interface SharePromoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function SharePromoSheet({
  open,
  onOpenChange,
  onSuccess,
}: SharePromoSheetProps) {
  const { user } = useUser();
  const { location } = useUserLocation();
  const createPromo = useCreatePromo();

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [discount, setDiscount] = useState("");
  const [storeName, setStoreName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar (JPG/PNG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran maksimal 5MB");
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!user?.id) {
      setError("Login dulu untuk bagikan promo");
      return;
    }
    if (!photo) {
      setError("Upload foto promo");
      return;
    }
    const product = productName.trim();
    const store = storeName.trim();
    const discountNum = parseInt(discount, 10);
    if (!product) {
      setError("Isi nama produk");
      return;
    }
    if (!store) {
      setError("Isi nama toko");
      return;
    }
    if (isNaN(discountNum) || discountNum < 1 || discountNum > 100) {
      setError("Diskon harus 1-100%");
      return;
    }

    setLoading(true);
    try {
      const todayCount = await fetchUserPromoCountToday(user.id);
      if (todayCount >= MAX_PROMOS_PER_DAY) {
        setError(`Maksimal ${MAX_PROMOS_PER_DAY} promo per hari. Coba lagi besok.`);
        setLoading(false);
        return;
      }

      const lastAtStore = await fetchLastPromoAtStore(user.id, store);
      if (lastAtStore) {
        const last = new Date(lastAtStore).getTime();
        const cooldownMs = STORE_COOLDOWN_MINUTES * 60 * 1000;
        if (Date.now() - last < cooldownMs) {
          const minsLeft = Math.ceil((cooldownMs - (Date.now() - last)) / 60000);
          setError(`Tunggu ${minsLeft} menit untuk promo di toko yang sama.`);
          setLoading(false);
          return;
        }
      }

      const storagePath = `promos/${user.id}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("promos")
        .upload(storagePath, photo, { upsert: false, contentType: photo.type });

      if (uploadError) {
        if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("not found")) {
          setError("Bucket 'promos' belum dibuat. Buat bucket 'promos' di Supabase Storage.");
        } else {
          setError("Gagal upload foto. Coba lagi.");
        }
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("promos")
        .getPublicUrl(uploadData.path);

      await createPromo.mutateAsync({
        userId: user.id,
        photoUrl: publicUrl,
        productName: product,
        discount: discountNum,
        storeName: store,
        latitude: location.lat,
        longitude: location.lng,
      });

      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Promo Berhasil Dibagikan!",
        message: `Promo ${product} di ${store} berhasil dibagikan. Dapat +10 cuan saat terverifikasi!`,
      });

      setPhoto(null);
      setPhotoPreview(null);
      setProductName("");
      setDiscount("");
      setStoreName("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError("Gagal mengirim promo. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError("");
    setPhoto(null);
    setPhotoPreview(null);
    setProductName("");
    setDiscount("");
    setStoreName("");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Bagikan Promo</SheetTitle>
          <SheetDescription>
            Upload foto dan isi detail promo dari toko terdekat
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Label>Foto Promo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30 py-8 transition-colors hover:bg-secondary/50"
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="max-h-32 rounded-lg object-cover"
                />
              ) : (
                <>
                  <Camera size={32} className="text-muted-foreground" />
                  <span className="mt-2 text-sm text-muted-foreground">
                    Ambil foto atau pilih dari galeri
                  </span>
                </>
              )}
            </button>
          </div>

          <div>
            <Label htmlFor="product">Nama Produk</Label>
            <Input
              id="product"
              placeholder="Contoh: Coca Cola 1.5L"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="discount">Diskon (%)</Label>
            <Input
              id="discount"
              type="number"
              min={1}
              max={100}
              placeholder="50"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="store">Nama Toko</Label>
            <Input
              id="store"
              placeholder="Contoh: Indomaret Sudirman"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
            <MapPin size={16} className="text-primary" />
            <span className="text-xs text-muted-foreground">
              Lokasi otomatis dari GPS
            </span>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Mengirim..." : "Bagikan Promo"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
