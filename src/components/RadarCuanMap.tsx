import { useState, useEffect, useMemo, useRef } from "react";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import mapboxgl from "mapbox-gl";

// Load mapbox CSS dynamically so it never blocks the home-page render.
// Injected once per session; safe to call from multiple map instances.
const MAPBOX_CSS = "https://api.mapbox.com/mapbox-gl-js/v3.19.1/mapbox-gl.css";
function injectMapboxCss() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[href="${MAPBOX_CSS}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = MAPBOX_CSS;
  document.head.appendChild(link);
}
injectMapboxCss();
import { useRadar } from "@/contexts/RadarContext";
import { useRadarPromos, type RadarMarker } from "@/hooks/useRadarPromos";
import { useUser } from "@/contexts/UserContext";
import { useUserLocation } from "@/hooks/useUserLocation";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";
const RADIUS_OPTIONS = [1, 2, 5, 10];

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
  if (km < 1) return `${(km * 1000).toFixed(0)} m dari kamu`;
  return `${km.toFixed(1)} km dari kamu`;
}

function PromoMarker({
  marker,
  color,
  onClick,
}: {
  marker: RadarMarker;
  color: string;
  onClick: () => void;
}) {
  return (
    <Marker
      latitude={marker.lat}
      longitude={marker.lng}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <button
        type="button"
        className="flex flex-col items-center cursor-pointer"
        aria-label={`Promo: ${marker.storeName}`}
      >
        <div
          className="rounded-md border-2 border-white px-1.5 py-0.5 text-[9px] font-bold text-white whitespace-nowrap shadow-lg"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}99`,
          }}
        >
          🔥
        </div>
        <div
          className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-0.5"
          style={{ borderTopColor: color }}
        />
      </button>
    </Marker>
  );
}

function MarkerPopup({
  marker,
  onClose,
}: {
  marker: RadarMarker;
  onClose: () => void;
}) {
  const priceStr =
    marker.price != null && marker.price > 0
      ? `Rp ${marker.price.toLocaleString()}`
      : null;

  return (
    <div className="absolute bottom-4 left-4 right-4 z-50 rounded-xl border border-border bg-card p-4 shadow-xl">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-muted-foreground text-lg leading-none"
      >
        ×
      </button>
      <p className="font-display font-bold text-foreground pr-6">
        {marker.storeName}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {formatDistance(marker.distanceKm)}
      </p>
      <p className="text-sm text-foreground mt-1">{marker.productName}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
          Diskon {marker.discount}%
        </span>
        {priceStr && (
          <span className="text-sm font-bold text-primary">{priceStr}</span>
        )}
      </div>
      <button
        onClick={onClose}
        className="mt-3 w-full rounded-lg bg-primary py-2.5 font-display font-bold text-sm text-primary-foreground"
      >
        Lihat Promo
      </button>
    </div>
  );
}

export default function RadarCuanMap() {
  const { radius, setRadius } = useRadar();
  const { user } = useUser();
  const { markers, isLoading, getMarkerColor } = useRadarPromos(radius, user?.id);
  const [selectedMarker, setSelectedMarker] = useState<RadarMarker | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const { location } = useUserLocation();

  const hasFlownRef = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !location) return;
    map.flyTo({
      center: [location.lng, location.lat],
      zoom: 12,
      duration: hasFlownRef.current ? 1000 : 0,
    });
    hasFlownRef.current = true;
  }, [location?.lat, location?.lng]);

  const initialViewState = useMemo(
    () => ({
      latitude: location?.lat ?? -6.2088,
      longitude: location?.lng ?? 106.8456,
      zoom: 12,
    }),
    []
  );

  const circleGeoJSON = useMemo(
    () =>
      createCircleGeoJSON(
        location?.lat ?? -6.2088,
        location?.lng ?? 106.8456,
        radius
      ),
    [location?.lat, location?.lng, radius]
  );

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
      <div className="flex items-center justify-between px-4 py-2 bg-card/95 border-b border-border">
        <div>
          <h3 className="font-display text-sm font-bold text-foreground">
            Radar Cuan
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Promo aktif di sekitarmu
          </p>
        </div>
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

      <div className="relative" style={{ height: "260px" }}>
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

          <Source
            id="radius-circle"
            type="geojson"
            data={circleGeoJSON as GeoJSON.Feature<GeoJSON.Polygon>}
          >
            <Layer
              id="radius-fill"
              type="fill"
              paint={{
                "fill-color": "rgb(139, 92, 246)",
                "fill-opacity": 0.08,
              }}
            />
            <Layer
              id="radius-line"
              type="line"
              paint={{
                "line-color": "rgb(139, 92, 246)",
                "line-width": 2,
                "line-opacity": 0.4,
              }}
            />
          </Source>

          <Marker
            latitude={location?.lat ?? -6.2088}
            longitude={location?.lng ?? 106.8456}
            anchor="center"
          >
            <div
              className="w-5 h-5 rounded-full bg-primary border-2 border-primary-foreground"
              style={{
                boxShadow: "0 0 16px hsl(150 100% 50% / 0.5)",
              }}
            />
          </Marker>

          {markers.map((marker) => (
            <PromoMarker
              key={marker.id}
              marker={marker}
              color={getMarkerColor(marker.discount)}
              onClick={() => setSelectedMarker(marker)}
            />
          ))}
        </Map>

        {isLoading && (
          <div className="absolute top-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] text-white">
            Loading...
          </div>
        )}

        {!isLoading && markers.length === 0 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-black/70 px-4 py-2 text-[10px] text-white text-center max-w-[200px]">
            Tidak ada promo dalam {radius} km
          </div>
        )}

        {selectedMarker && (
          <MarkerPopup
            marker={selectedMarker}
            onClose={() => setSelectedMarker(null)}
          />
        )}
      </div>
    </div>
  );
}
