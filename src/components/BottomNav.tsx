import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Ticket, Radar, Home, Trophy, Users } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/earn", icon: Ticket, labelKey: "nav.earn" },
  { path: "/radar", icon: Radar, labelKey: "nav.radar" },
  { path: "/", icon: Home, labelKey: "nav.home", isCenter: true },
  { path: "/rank", icon: Trophy, labelKey: "nav.rank" },
  { path: "/invite", icon: Users, labelKey: "nav.invite" },
] as const;

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { theme } = useUser();
  const isDark = theme === "dark";

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)]",
        isDark
          ? "border-t border-white/[0.08] bg-[rgba(6,8,16,0.98)]"
          : "border-t border-slate-200/90 bg-white/95 shadow-[0_-4px_24px_rgba(15,23,42,0.06)]"
      )}
    >
      <div className="mx-auto flex max-w-[420px] items-center justify-around px-1 py-2.5">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/rank" && location.pathname === "/leaderboard");
          const isCenter = "isCenter" in item && item.isCenter;

          const centerActive = isCenter && isActive;
          const centerInactive = isCenter && !isActive;

          const sideIconClass = !isCenter
            ? isActive
              ? isDark
                ? "text-[#4ade80]"
                : "text-[#3B82F6]"
              : isDark
                ? "text-white/90"
                : "text-slate-600"
            : undefined;

          const labelClass = isActive
            ? isDark
              ? "text-[#4ade80]"
              : "text-[#1A2B48]"
            : isDark
              ? "text-white/90"
              : "text-slate-600";

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavClick(item.path)}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center gap-1 px-2 py-1 transition-opacity",
                isCenter && "-mt-1",
                !isActive && "opacity-50",
                isActive && "opacity-100"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full transition-all",
                  isCenter && "p-2.5",
                  centerActive &&
                    (isDark
                      ? "bg-[#4ade80] text-[#001a09] shadow-[0_0_18px_rgba(74,222,128,0.6)]"
                      : "bg-[#3B82F6] text-white shadow-[0_4px_14px_rgba(59,130,246,0.45)]"),
                  centerInactive &&
                    (isDark ? "bg-white/20 text-white/90" : "bg-slate-200/80 text-slate-600")
                )}
              >
                <item.icon size={isCenter ? 24 : 20} className={sideIconClass} />
              </span>
              <span className={cn("w-full truncate text-center text-[10px] font-medium", labelClass)}>
                {t(item.labelKey)}
              </span>
              {centerActive && (
                <span
                  className={cn(
                    "absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                    isDark
                      ? "bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.8)]"
                      : "bg-[#3B82F6] shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
