import Map, { Marker, NavigationControl } from "react-map-gl";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useDeals } from "@/hooks/useDeals";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  throw new Error(
    "Mapbox token is missing. Please set VITE_MAPBOX_TOKEN in your environment.",
  );
}

export default function PromoMap() {
  const { data: deals = [], isLoading } = useDeals();

  const hasDeals = deals.length > 0;
  const centerLat = hasDeals ? deals[0].lat : -6.2088;
  const centerLng = hasDeals ? deals[0].lng : 106.8456;

  return (
    <div
      style={{
        width: "100%",
        height: "260px",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        mapLib={mapboxgl}
        initialViewState={{
          latitude: centerLat,
          longitude: centerLng,
          zoom: 12,
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-right" />

        {isLoading && (
          <div className="absolute top-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white">
            Loading deals...
          </div>
        )}

        {!isLoading && !hasDeals && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-1.5 text-[10px] text-white">
            Belum ada promo di dekatmu. Upload struk untuk mulai berburu!
          </div>
        )}

        {deals.map((deal) => (
          <Marker
            key={deal.id}
            latitude={deal.lat}
            longitude={deal.lng}
            anchor="center"
          >
            <div
              style={{
                width: "14px",
                height: "14px",
                backgroundColor: "#ff3b3b",
                borderRadius: "50%",
                boxShadow: "0 0 8px rgba(255,0,0,0.8)",
              }}
            />
          </Marker>
        ))}
      </Map>
    </div>
  );
}

