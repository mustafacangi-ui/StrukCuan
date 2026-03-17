import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Radar, Gift, Home, Trophy, User, ClipboardList } from "lucide-react";

const navItems = [
  { path: "/map", icon: Radar, labelKey: "nav.radar" },
  { path: "/promo", icon: Gift, labelKey: "nav.campaigns" },
  { path: "/", icon: Home, labelKey: "nav.home", isCenter: true },
  { path: "/surveys", icon: ClipboardList, labelKey: "nav.surveys", activeColor: "pink" as const },
  { path: "/rewards", icon: Trophy, labelKey: "nav.rewards" },
  { path: "/settings", icon: User, labelKey: "nav.profile" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#1a0f3c]/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[420px] items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isCenter = "isCenter" in item && item.isCenter;
          const usePink = "activeColor" in item && item.activeColor === "pink";
          const activeColorClass = usePink ? "text-theme-pink" : "text-theme-green";
          const activeBgClass = usePink
            ? "bg-theme-pink text-[#001a09] shadow-[0_0_18px_rgba(255,78,205,0.55)]"
            : "bg-theme-green text-[#001a09] shadow-[0_0_18px_rgba(0,230,118,0.55)]";
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] ${
                isCenter ? "relative -mt-1" : ""
              }`}
            >
              <span
                className={`flex items-center justify-center rounded-full transition-colors ${
                  isCenter
                    ? `p-2 ${isActive ? activeBgClass : "bg-white/10 text-white/70"}`
                    : ""
                }`}
              >
                <item.icon
                  size={isCenter ? 24 : 20}
                  className={!isCenter && (isActive ? activeColorClass : "text-white/60")}
                />
              </span>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? activeColorClass : "text-white/60"
                }`}
              >
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
