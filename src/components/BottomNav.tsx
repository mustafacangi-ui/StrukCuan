import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Ticket, Radar, Home, Trophy, Users } from "lucide-react";

const navItems = [
  { path: "/earn", icon: Ticket, labelKey: "nav.earn" },
  { path: "/", icon: Radar, labelKey: "nav.radar" },
  { path: "/home", icon: Home, labelKey: "nav.home", isCenter: true },
  { path: "/rank", icon: Trophy, labelKey: "nav.rank" },
  { path: "/invite", icon: Users, labelKey: "nav.invite" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/20 bg-black/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[420px] items-center justify-around px-1 py-2.5">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/rank" && location.pathname === "/leaderboard");
          const isCenter = "isCenter" in item && item.isCenter;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center gap-1 px-2 py-1 min-w-0 flex-1 relative transition-opacity ${
                isCenter ? "-mt-1" : ""
              } ${!isActive ? "opacity-50" : "opacity-100"}`}
            >
              <span
                className={`flex items-center justify-center rounded-full transition-all ${
                  isCenter
                    ? `p-2.5 ${
                        isActive
                          ? "bg-[#4ade80] text-[#001a09] shadow-[0_0_18px_rgba(74,222,128,0.6)]"
                          : "bg-white/20 text-white/90"
                      }`
                    : ""
                }`}
              >
                <item.icon
                  size={isCenter ? 24 : 20}
                  className={
                    !isCenter
                      ? isActive
                        ? "text-[#4ade80]"
                        : "text-white/90"
                      : undefined
                  }
                />
              </span>
              <span
                className={`text-[10px] font-medium truncate w-full text-center ${
                  isActive ? "text-[#4ade80]" : "text-white/90"
                }`}
              >
                {t(item.labelKey)}
              </span>
              {isCenter && isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
