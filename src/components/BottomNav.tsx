import { Home, Tag, Camera, Repeat, User } from "lucide-react";

const navItems = [
  { icon: Home, label: "Beranda", active: true },
  { icon: Tag, label: "Promo", active: false },
  { icon: Camera, label: "Ambil Foto", active: false, hidden: true },
  { icon: Repeat, label: "Tukar", active: false },
  { icon: User, label: "Profil", active: false },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
              item.hidden ? "opacity-0 pointer-events-none" : ""
            }`}
          >
            <item.icon
              size={20}
              className={item.active ? "text-primary" : "text-muted-foreground"}
            />
            <span
              className={`text-[10px] font-medium ${
                item.active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
