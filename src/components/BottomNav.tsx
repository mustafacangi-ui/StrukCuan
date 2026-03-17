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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0f0d14]/95 backdrop-blur-xl">
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
                          ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(270_70%_60%_/_0.4)]"
                          : "bg-white/10 text-white/60"
                      }`
                    : ""
                }`}
              >
                <item.icon
                  size={isCenter ? 24 : 20}
                  className={!isCenter && (isActive ? "text-primary" : "text-muted-foreground")}
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
