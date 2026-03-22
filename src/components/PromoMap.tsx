import { useEffect, useMemo, useRef } from "react";
import Map, { Marker, NavigationControl, Source, Layer } from "react-map-gl";
import mapboxgl from "mapbox-gl";

// Load mapbox CSS dynamically so it never blocks the home-page render.
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
import type { DealWithDistance } from "@/hooks/useDealsWithRadius";
import { haversineDistance, SAFE_DEFAULT_COORDS } from "@/hooks/useUserLocation";
import MapMarker from "@/components/MapMarker";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

/** Safe coords for Mapbox — never NaN, fallback when GPS is slow */
function safeMapCoords(lat: number | undefined, lng: number | undefined) {
  const safeLat = Number.isFinite(lat) ? lat! : SAFE_DEFAULT_COORDS.lat;
  const safeLng = Number.isFinite(lng) ? lng! : SAFE_DEFAULT_COORDS.lng;
  return { lat: safeLat, lng: safeLng };
}

const RADIUS_OPTIONS = [3, 5, 10];

/** Zoom level by radius: 3km=14, 5km=12, 10km=10 */
function zoomForRadius(km: number): number {
  if (km <= 3) return 14;
  if (km <= 5) return 12;
  return 10;
}

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

interface PromoMapProps {
  /** Map height in px when used as full page (default 260) */
  height?: number;
  /** Called when user taps a deal marker */
  onDealSelect?: (deal: DealWithDistance) => void;
  /** Currently selected deal (for highlighting) */
  selectedDealId?: number | null;
}

export default function PromoMap({ height = 260, onDealSelect, selectedDealId }: PromoMapProps) {
  const { radius, setRadius, deals, isLoading, userLocation } = useRadar();
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const hasFlownRef = useRef(false);

  const coords = safeMapCoords(userLocation?.lat, userLocation?.lng);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [coords.lng, coords.lat],
      zoom: zoomForRadius(radius),
      duration: hasFlownRef.current ? 800 : 0,
    });
    hasFlownRef.current = true;
  }, [coords.lat, coords.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [coords.lng, coords.lat],
      zoom: zoomForRadius(radius),
      duration: 800,
    });
  }, [radius, coords.lat, coords.lng]);

  const initialViewState = useMemo(
    () => ({
      latitude: coords.lat,
      longitude: coords.lng,
      zoom: zoomForRadius(5),
    }),
    []
  );

  const circleGeoJSON = useMemo(
    () => createCircleGeoJSON(coords.lat, coords.lng, radius),
    [coords.lat, coords.lng, radius]
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
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,230,118,0.15)", boxShadow: "0 0 24px rgba(0,230,118,0.08)" }}>
      {/* Header — dark glass */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/8"
        style={{ background: "rgba(5,3,15,0.80)", backdropFilter: "blur(16px)" }}
      >
        <div className="flex items-center gap-1.5">
          {/* Live dot */}
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#ef4444] animate-ping opacity-70"
              style={{ boxShadow: "0 0 6px #ef4444" }} />
            <span className="relative inline-flex h-full w-full rounded-full bg-[#ef4444]"
              style={{ boxShadow: "0 0 6px #ef4444" }} />
          </span>
          <span className="text-[11px] font-bold text-white/90 font-display tracking-wide">
            Active Promos Nearby –{" "}
            <span className="text-[#ef4444]" style={{ textShadow: "0 0 6px rgba(239,68,68,0.7)" }}>
              LIVE
            </span>
          </span>
        </div>
        {/* Radius pills */}
        <div className="flex gap-1">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-200"
              style={
                radius === r
                  ? {
                      background: "rgba(0,230,118,0.18)",
                      border: "1px solid rgba(0,230,118,0.45)",
                      color: "#00E676",
                      boxShadow: "0 0 8px rgba(0,230,118,0.4)",
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)",
                    }
              }
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
                "fill-color": "rgba(0,230,118,0.12)",
                "fill-opacity": 0.08,
              }}
            />
            <Layer
              id="radius-line"
              type="line"
              paint={{
                "line-color": "#00E676",
                "line-width": 1.5,
                "line-opacity": 0.55,
                "line-dasharray": [4, 3],
              }}
            />
          </Source>

          {/* User location — glowing dot + concentric rings */}
          <Marker latitude={coords.lat} longitude={coords.lng} anchor="center">
            <div className="relative flex items-center justify-center w-16 h-16">
              {/* Expanding ring 1 */}
              <div className="absolute w-10 h-10 rounded-full border border-[#00E676]/40"
                style={{ animation: "radar-ring-expand 2.5s ease-out infinite" }} />
              {/* Expanding ring 2 — offset */}
              <div className="absolute w-10 h-10 rounded-full border border-[#00E676]/30"
                style={{ animation: "radar-ring-expand 2.5s ease-out 1.25s infinite" }} />
              {/* Static inner ring */}
              <div className="absolute w-6 h-6 rounded-full border border-[#00E676]/50" />
              {/* Core dot */}
              <div className="w-3.5 h-3.5 rounded-full bg-[#00E676] relative z-10"
                style={{ boxShadow: "0 0 10px rgba(0,230,118,0.9), 0 0 20px rgba(0,230,118,0.5)" }} />
            </div>
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
                    backgroundColor: "rgba(0,230,118,0.12)",
                  }}
                />
              </Marker>
            );
          })}

          {/* Promo markers */}
          {(Array.isArray(deals) ? deals : [])
            .filter((d) => d && Number.isFinite(d.lat) && Number.isFinite(d.lng))
            .map((deal) => (
              <MapMarker
                key={deal.id}
                deal={deal}
                onClick={() => onDealSelect?.(deal)}
                isSelected={selectedDealId === deal.id}
              />
            ))}
        </Map>

        {/* Dark tint — makes markers and names pop */}
        <div className="absolute inset-0 bg-black/20 pointer-events-none z-[5] rounded-b-2xl" aria-hidden />

        {/* ── Radar sweep CSS overlay (centered on user location ≈ map center) ── */}
        <div className="absolute inset-0 pointer-events-none z-[6] flex items-center justify-center overflow-hidden rounded-b-2xl">
          {/* Rotating sweep beam */}
          <div
            className="absolute rounded-full"
            style={{
              width:  `${height * 0.72}px`,
              height: `${height * 0.72}px`,
              background: "conic-gradient(from 0deg, transparent 0deg, rgba(0,230,118,0.18) 35deg, rgba(0,230,118,0.04) 60deg, transparent 65deg)",
              animation: "radar-sweep 4s linear infinite",
            }}
          />
          {/* Static concentric rings */}
          <div className="absolute rounded-full border border-[#00E676]/20"
            style={{ width: `${height * 0.24}px`, height: `${height * 0.24}px` }} />
          <div className="absolute rounded-full border border-[#00E676]/14"
            style={{ width: `${height * 0.48}px`, height: `${height * 0.48}px` }} />
          <div className="absolute rounded-full border border-[#00E676]/10"
            style={{ width: `${height * 0.72}px`, height: `${height * 0.72}px` }} />
          {/* Radius label — floats above center */}
          <div className="absolute"
            style={{ top: `calc(50% - ${height * 0.16}px)` }}>
            <span className="text-[9px] font-bold text-[#00E676]/80 px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(0,230,118,0.25)" }}>
              {radius} km radius
            </span>
          </div>
        </div>

        {isLoading && (
          <div className="absolute top-2 left-2 z-20 rounded-lg bg-black/70 px-2 py-1 text-[10px] text-white">
            Loading...
          </div>
        )}

        {!isLoading && deals.length === 0 && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 rounded-lg bg-black/70 px-4 py-2 text-[10px] text-white text-center max-w-[200px]">
            No promos within {radius} km
          </div>
        )}
      </div>
    </div>
  );
}
