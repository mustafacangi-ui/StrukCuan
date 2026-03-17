import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Radar, Gift, Home, Trophy, User } from "lucide-react";

const navItems = [
  { path: "/map", icon: Radar, labelKey: "nav.radar" },
  { path: "/promo", icon: Gift, labelKey: "nav.campaigns" },
  { path: "/", icon: Home, labelKey: "nav.home", isCenter: true },
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/20 bg-white/20 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[420px] items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isCenter = "isCenter" in item && item.isCenter;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 min-w-[64px] ${
                isCenter ? "relative -mt-1" : ""
              }`}
            >
              <span
                className={`flex items-center justify-center rounded-full transition-colors ${
                  isCenter
                    ? `p-2 ${
                        isActive
                          ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-[0_0_16px_rgba(34,197,94,0.5)]"
                          : "bg-white/30 text-white/80"
                      }`
                    : ""
                }`}
              >
                <item.icon
                  size={isCenter ? 24 : 20}
                  className={!isCenter && (isActive ? "text-emerald-400" : "text-white/70")}
                />
              </span>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-white/60"
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
