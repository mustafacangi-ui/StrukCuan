/** Hata Koruması — Safe loading state for Radar screen */
export default function RadarSkeleton() {
  return (
    <div
      className="min-h-screen max-w-[430px] mx-auto flex flex-col pb-20"
      style={{
        background: "linear-gradient(160deg,#0f0726 0%,#1a0d40 50%,#0d0520 100%)",
      }}
    >
      {/* Topbar skeleton */}
      <div className="sticky top-0 z-50 border-b border-white/10 px-4 py-3.5 flex items-center gap-3 bg-[rgba(15,7,38,0.75)]">
        <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
        <div className="h-6 w-24 rounded bg-white/10 animate-pulse flex-1" />
        <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
      </div>

      {/* Map placeholder */}
      <div className="mx-3.5 mt-3.5 rounded-[20px] overflow-hidden border border-white/15 h-[240px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-[#00E676]/40 animate-spin"
            style={{ borderTopColor: "transparent" }}
          />
          <p className="text-sm text-white/60">Getting your location...</p>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 px-3.5 pt-4 space-y-6">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-9 w-20 rounded-full bg-white/10 animate-pulse"
            />
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-5 w-32 rounded bg-white/10 animate-pulse" />
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-5 w-40 rounded bg-white/10 animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
