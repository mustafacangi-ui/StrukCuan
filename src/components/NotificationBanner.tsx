import { MapPin } from "lucide-react";

const NotificationBanner = () => {
  return (
    <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg bg-neon-red/10 border border-neon-red/20 px-3 py-2">
      <MapPin size={14} className="text-neon-red shrink-0" />
      <p className="text-[11px] text-foreground">
        <span className="font-semibold text-neon-red">Indomaret 500m</span> – Chicken{" "}
        <span className="font-bold text-neon-red">-50%</span> · Tap to view
      </p>
    </div>
  );
};

export default NotificationBanner;
