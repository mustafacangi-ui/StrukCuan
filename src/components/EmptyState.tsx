import { useTranslation } from "react-i18next";
import { Radar, MapPin } from "lucide-react";

interface EmptyStateProps {
  /** i18n key for title (default: empty.comingSoon) */
  titleKey?: string;
  /** i18n key for subtitle (default: empty.radarScanning) */
  subtitleKey?: string;
  /** Optional custom icon */
  icon?: "radar" | "map";
  className?: string;
}

export function EmptyState({
  titleKey = "empty.comingSoon",
  subtitleKey = "empty.radarScanning",
  icon = "radar",
  className = "",
}: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#00FF88]/10 border border-[#00FF88]/20 mb-4">
        {icon === "radar" ? (
          <Radar size={32} className="text-[#00FF88]" />
        ) : (
          <MapPin size={32} className="text-[#00FF88]" />
        )}
      </div>
      <h3 className="font-display text-lg font-bold text-white mb-2">
        {t(titleKey)}
      </h3>
      <p className="text-sm text-white/60 max-w-[260px]">
        {t(subtitleKey)}
      </p>
    </div>
  );
}
