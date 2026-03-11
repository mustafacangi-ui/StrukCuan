import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddDealForm() {
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [store, setStore] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const submitDeal = async () => {
    let imageUrl = null;

    // FOTOĞRAF YÜKLEME
    if (image) {
      const fileName = `${Date.now()}-${image.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("deals")
        .upload(fileName, image);

      if (uploadError || !uploadData?.path) {
        console.error(uploadError);
        alert("Image upload failed");
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("deals").getPublicUrl(uploadData.path);

      imageUrl = publicUrl;
    }

    // DEAL DATABASE INSERT
    const { data, error } = await supabase
      .from("deals")
      .insert([
        {
          product_name: product,
          price: Number(price),
          store: store,
          lat: -6.2,
          lng: 106.8,
          image: imageUrl,
          status: "pending",
        },
      ])
      .select(); // 🔥 Realtime için önemli

    console.log(data, error);

    if (error) {
      alert("Deal eklenemedi");
      return;
    }

    alert("Deal added!");

    // FORM RESET
    setProduct("");
    setPrice("");
    setStore("");
    setImage(null);
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h2 className="text-lg font-bold mb-2">Add Deal</h2>

      <input
        className="border p-2 w-full mb-2"
        placeholder="Product name"
        value={product}
        onChange={(e) => setProduct(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-2"
        placeholder="Price"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
      />

      <input
        className="border p-2 w-full mb-2"
        placeholder="Store (Indomaret / Alfamart)"
        value={store}
        onChange={(e) => setStore(e.target.value)}
      />

      <input
        type="file"
        accept="image/*"
        className="border p-2 w-full mb-2"
        onChange={(e) => {
          if (e.target.files) {
            setImage(e.target.files[0]);
          }
        }}
      />

      <button
        onClick={submitDeal}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Submit Deal
      </button>
    </div>
  );
}
