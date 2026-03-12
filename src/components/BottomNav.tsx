import { useNavigate, useLocation } from "react-router-dom";
import { Home, Tag, Camera, Trophy, User } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

const navItems = [
  { path: "/", icon: Home, label: "HOME" },
  { path: "/promo", icon: Tag, label: "PROMO" },
  { path: "/", icon: Camera, label: "UPLOAD", redirectToHome: true },
  { path: "/leaderboard", icon: Trophy, label: "RANK" },
  { path: "/settings", icon: User, label: "PROFILE", requiresAuth: true },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnboarded, requireLogin } = useUser();

  const handleNavClick = (item: (typeof navItems)[number]) => {
    if ("redirectToHome" in item && item.redirectToHome) {
      navigate("/");
      return;
    }
    if (item.requiresAuth && !isOnboarded) {
      requireLogin("profile");
      return;
    }
    navigate(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[420px] items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = "redirectToHome" in item ? false : location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item)}
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
