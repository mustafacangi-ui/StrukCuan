import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface UserData {
  phone: string;
  nickname: string;
  cuan: number;
  tiket: number;
  level: number;
  isNewUser: boolean;
}

type PendingAction = "camera" | "profile" | null;

interface UserContextType {
  user: UserData | null;
  isOnboarded: boolean;
  login: (phone: string, nickname: string) => void;
  logout: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  pushNotifications: boolean;
  togglePushNotifications: () => void;
  showLoginSheet: boolean;
  pendingAction: PendingAction;
  requireLogin: (action: PendingAction) => void;
  dismissLogin: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(() => {
    const saved = localStorage.getItem("struk_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("struk_theme") as "dark" | "light") || "dark";
  });

  const [pushNotifications, setPushNotifications] = useState(() => {
    return localStorage.getItem("struk_push") !== "false";
  });

  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("struk_theme", theme);
  }, [theme]);

  const login = useCallback((phone: string, nickname: string) => {
    const newUser: UserData = {
      phone,
      nickname,
      cuan: 0,
      tiket: 0,
      level: 1,
      isNewUser: true,
    };
    setUser(newUser);
    localStorage.setItem("struk_user", JSON.stringify(newUser));
    setShowLoginSheet(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("struk_user");
  }, []);

  const requireLogin = useCallback((action: PendingAction) => {
    setPendingAction(action);
    setShowLoginSheet(true);
  }, []);

  const dismissLogin = useCallback(() => {
    setShowLoginSheet(false);
    setPendingAction(null);
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const togglePushNotifications = () => {
    setPushNotifications((p) => {
      localStorage.setItem("struk_push", String(!p));
      return !p;
    });
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isOnboarded: !!user,
        login,
        logout,
        theme,
        toggleTheme,
        pushNotifications,
        togglePushNotifications,
        showLoginSheet,
        pendingAction,
        requireLogin,
        dismissLogin,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
