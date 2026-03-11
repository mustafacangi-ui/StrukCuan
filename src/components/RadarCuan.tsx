import { Radar } from "lucide-react";
import { useRadar } from "@/contexts/RadarContext";

const RadarCuan = () => {
  const { radius, setRadius, promoCount } = useRadar();

  return (
    <div className="p-6 text-center">
      <Radar className="mx-auto text-green-400" size={40} />

      <h2 className="text-xl font-bold mt-2">
        Radar Cuan
      </h2>

      <p className="text-sm mt-2">
        Radius: {radius} km
      </p>

      <p className="text-lg font-bold text-green-400">
        {promoCount} Promo Aktif
      </p>

      <div className="flex gap-2 justify-center mt-4">
        {[1,2,5,10].map(r => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            className="px-3 py-1 border rounded"
          >
            {r}km
          </button>
        ))}
      </div>
    </div>
  );
};

export default RadarCuan;