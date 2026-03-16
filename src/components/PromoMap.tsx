import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useRadar } from "@/contexts/RadarContext";
import { useDealsWithRadius, type DealWithDistance } from "@/hooks/useDealsWithRadius";
import { haversineDistance } from "@/hooks/useUserLocation";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

const RADIUS_OPTIONS = [3, 5, 10];

const RED_LABEL_PIN = { bg: "#FF0000", glow: "rgba(255,0,0,0.9)" };
const RED_PIN = { bg: "#FF3B3B", glow: "rgba(255,59,59,0.8)" };
const GREEN_PIN = { bg: "#22C55E", glow: "rgba(34,197,94,0.6)" };

function createCircleGeoJSON(lat: number, lng: number, radiusKm: number) {
  const points: [number, number][] = [];
  const R = 6371;
  const d = radiusKm / R;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  for (let i = 0; i <= 64; i++) {
    const brng = (2 * Math.PI * i) / 64;
    const lat2 = Math.asin(
      Math.sin(latRad) * Math.cos(d) +
        Math.cos(latRad) * Math.sin(d) * Math.cos(brng)
    );
    const lng2 =
      lngRad +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(latRad),
        Math.cos(d) - Math.sin(latRad) * Math.sin(lat2)
      );
    points.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [points],
    },
  };
}

function formatDistance(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  return `${km.toFixed(1)} km`;
}

function formatPrice(price?: number | null): string {
  if (price == null || price <= 0) return "Promo";
  return `Rp ${price.toLocaleString()}`;
}

function PromoMarker({
  deal,
  onClick,
}: {
  deal: DealWithDistance;
  onClick: () => void;
}) {
  const priceLabel = formatPrice(deal.price);
  const isRedLabel = deal.isRedLabel;
  const pin = isRedLabel ? RED_LABEL_PIN : GREEN_PIN;
  return (
    <Marker
      latitude={deal.lat}
      longitude={deal.lng}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <button
        type="button"
        className="flex flex-col items-center cursor-pointer group"
        aria-label={`Promo: ${deal.store ?? "Store"} - ${priceLabel}`}
      >
        <div
          className={`rounded-md border-2 border-white px-1.5 py-0.5 text-[9px] font-bold text-white whitespace-nowrap shadow-lg flex items-center gap-0.5 ${
            isRedLabel ? "animate-pulse" : ""
          }`}
          style={{
            backgroundColor: pin.bg,
            boxShadow: `0 0 ${isRedLabel ? 14 : 10}px ${pin.glow}`,
          }}
        >
          {isRedLabel && <span className="text-[10px]">🔥</span>}
          {priceLabel}
        </div>
        <div
          className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-0.5"
          style={{ borderTopColor: pin.bg }}
        />
      </button>
    </Marker>
  );
}

function PromoCardPopup({
  deal,
  onClose,
  onViewPromo,
}: {
  deal: DealWithDistance;
  onClose: () => void;
  onViewPromo: () => void;
}) {
  const priceStr = deal.price
    ? `Rp ${deal.price.toLocaleString()}`
    : "View price";
  const discount = (deal as DealWithDistance & { discount?: number }).discount;
  const discountStr = discount ? `-${discount}%` : "Promo";

  return (
    <div className="absolute bottom-4 left-4 right-4 z-50 rounded-xl border border-border bg-card overflow-hidden shadow-xl">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 rounded-full bg-black/30 p-1 text-white text-lg leading-none hover:bg-black/50"
      >
        ×
      </button>
      <div className="flex gap-3 p-4">
        {deal.image ? (
          <img
            src={deal.image}
            alt={deal.product_name ?? "Product"}
            className="w-16 h-16 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">
            No img
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-foreground text-sm">
            {deal.product_name ?? "Promo available"}
          </p>
          <p className="text-sm font-bold text-primary mt-0.5">{priceStr}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {deal.store ?? "Toko"}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {formatDistance(deal.distanceKm)} away
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                deal.isRedLabel
                  ? "bg-red-500/20 text-red-600"
                  : "bg-primary/20 text-primary"
              }`}
            >
              {discountStr}
            </span>
          </div>
        </div>
      </div>
      <button
        onClick={onViewPromo}
        className="w-full rounded-b-xl bg-primary py-2.5 font-display font-bold text-sm text-primary-foreground hover:bg-primary/90"
      >
        View Promo
      </button>
    </div>
  );
}

interface PromoMapProps {
  /** Map height in px when used as full page (default 260) */
  height?: number;
}

export default function PromoMap({ height = 260 }: PromoMapProps) {
  const { radius, setRadius } = useRadar();
  const { deals, isLoading, userLocation } = useDealsWithRadius(radius);
  const [selectedDeal, setSelectedDeal] = useState<DealWithDistance | null>(
    null
  );
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const hasFlownRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;
    map.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 12,
      duration: hasFlownRef.current ? 1000 : 0,
    });
    hasFlownRef.current = true;
  }, [userLocation.lat, userLocation.lng]);

  const initialViewState = useMemo(
    () => ({
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      zoom: 12,
    }),
    [] // Stable on mount - flyTo handles location updates
  );

  const circleGeoJSON = useMemo(
    () => createCircleGeoJSON(userLocation.lat, userLocation.lng, radius),
    [userLocation.lat, userLocation.lng, radius]
  );

  const heatmapDeals = useMemo(() => {
    const clusters: DealWithDistance[][] = [];
    const used = new Set<number>();
    for (const d of deals) {
      if (used.has(d.id)) continue;
      const nearby = deals.filter(
        (o) =>
          !used.has(o.id) &&
          haversineDistance(d.lat, d.lng, o.lat, o.lng) < 0.3
      );
      if (nearby.length > 1) {
        nearby.forEach((o) => used.add(o.id));
        clusters.push(nearby);
      }
    }
    return clusters;
  }, [deals]);

  const handleViewPromo = useCallback(() => {
    if (selectedDeal) {
      setSelectedDeal(null);
    }
  }, [selectedDeal]);

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN === "YOUR_MAPBOX_PUBLIC_TOKEN") {
    return (
      <div className="h-[280px] rounded-xl border border-border bg-card flex items-center justify-center">
        <p className="text-sm text-muted-foreground px-4">
          Set VITE_MAPBOX_TOKEN to enable map
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-card/95 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-red opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-red" />
          </span>
          <span className="text-sm font-bold text-foreground">
            Active Promos Nearby - LIVE
          </span>
        </div>
        {/* Radius filters */}
        <div className="flex gap-1">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                radius === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {r}km
            </button>
          ))}
        </div>
      </div>

      <div className="relative" style={{ height: `${height}px` }}>
        <Map
          ref={(ref) => {
            if (ref) mapRef.current = ref.getMap();
          }}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapLib={mapboxgl}
          initialViewState={initialViewState}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" />

          {/* Radius circle */}
          <Source
            id="radius-circle"
            type="geojson"
            data={circleGeoJSON as GeoJSON.Feature<GeoJSON.Polygon>}
          >
            <Layer
              id="radius-fill"
              type="fill"
              paint={{
                "fill-color": "#00FF88",
                "fill-opacity": 0.08,
              }}
            />
            <Layer
              id="radius-line"
              type="line"
              paint={{
                "line-color": "#00FF88",
                "line-width": 2,
                "line-opacity": 0.4,
              }}
            />
          </Source>

          {/* User location */}
          <Marker
            latitude={userLocation.lat}
            longitude={userLocation.lng}
            anchor="center"
          >
            <div
              className="w-5 h-5 rounded-full bg-primary border-2 border-primary-foreground"
              style={{
                boxShadow: "0 0 16px hsl(150 100% 50% / 0.5)",
              }}
            />
          </Marker>

          {/* Heatmap circles for clustered promos (render behind markers) */}
          {heatmapDeals.map((cluster, i) => {
            if (cluster.length < 2) return null;
            const center = cluster[0];
            return (
              <Marker
                key={`heat-${i}`}
                latitude={center.lat}
                longitude={center.lng}
                anchor="center"
              >
                <div
                  className="rounded-full border-2 border-primary/40"
                  style={{
                    width: 32 + Math.min(cluster.length, 5) * 6,
                    height: 32 + Math.min(cluster.length, 5) * 6,
                    backgroundColor: "rgba(0,255,136,0.12)",
                  }}
                />
              </Marker>
            );
          })}

          {/* Promo markers */}
          {deals.map((deal) => (
            <PromoMarker
              key={deal.id}
              deal={deal}
              onClick={() => setSelectedDeal(deal)}
            />
          ))}
        </Map>

        {isLoading && (
          <div className="absolute top-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] text-white">
            Loading...
          </div>
        )}

        {!isLoading && deals.length === 0 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/70 px-4 py-2 text-[10px] text-white text-center max-w-[200px]">
            No promos within {radius} km
          </div>
        )}

        {selectedDeal && (
          <PromoCardPopup
            deal={selectedDeal}
            onClose={() => setSelectedDeal(null)}
            onViewPromo={handleViewPromo}
          />
        )}
      </div>
    </div>
  );
}
