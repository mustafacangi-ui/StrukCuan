import { useNavigate, useLocation } from "react-router-dom";
import { Home, Tag, Camera, Trophy, User } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "HOME" },
  { path: "/promo", icon: Tag, label: "PROMO" },
  { path: "/upload", icon: Camera, label: "UPLOAD" },
  { path: "/leaderboard", icon: Trophy, label: "RANK" },
  { path: "/settings", icon: User, label: "PROFILE" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 min-w-[64px]"
            >
              <item.icon
                size={20}
                className={isActive ? "text-primary" : "text-muted-foreground"}
              />
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
