import { useNavigate, useLocation } from "react-router-dom";
import { Home, Ticket, Radar, Trophy, Gift, UserPlus } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/promo", icon: Ticket, label: "Promo" },
  { path: "/map", icon: Radar, label: "Map", isCenter: true },
  { path: "/rewards", icon: Gift, label: "Ödüller" },
  { path: "/leaderboard", icon: Trophy, label: "Rank" },
  { path: "/invite", icon: UserPlus, label: "Invite" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
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
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "bg-muted/50 text-muted-foreground"
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
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
