import type { ReactNode } from "react";

interface NearbyListProps {
  children: ReactNode;
}

/**
 * Live radar wrapper for the Nearby Opportunities list.
 *
 * Renders:
 * - Vertical scan-line that sweeps top → bottom every 6 s
 * - A second scan-line offset by 3 s for a double-sweep feel
 * - Subtle radial ambient glow at the top of the section
 */
export default function NearbyList({ children }: NearbyListProps) {
  return (
    <div className="relative">
      {/* ── Ambient radial glow — very faint green from the top ── */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-3xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(0,230,118,0.028) 0%, transparent 65%)",
        }}
        aria-hidden
      />

      {/* ── Scan line overlay ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl"
        aria-hidden
      >
        {/* Primary beam */}
        <div
          className="absolute left-0 right-0"
          style={{
            height: "3px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(0,230,118,0.025) 15%, rgba(0,230,118,0.048) 50%, rgba(0,230,118,0.025) 85%, transparent 100%)",
            animation: "scan-sweep 6s linear infinite",
          }}
        />
        {/* Secondary beam — offset by half the period */}
        <div
          className="absolute left-0 right-0"
          style={{
            height: "2px",
            background:
              "linear-gradient(to right, transparent 0%, rgba(0,230,118,0.015) 20%, rgba(0,230,118,0.03) 50%, rgba(0,230,118,0.015) 80%, transparent 100%)",
            animation: "scan-sweep 6s linear 3s infinite",
          }}
        />
      </div>

      {/* List rows */}
      <div className="relative z-10 flex flex-col gap-2">{children}</div>
    </div>
  );
}
