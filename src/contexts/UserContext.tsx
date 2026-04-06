import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { REFERRAL_STORAGE_KEY } from "@/components/ReferralCapture";
import { APP_URL, getAuthRedirectUrl, IS_LOCALHOST } from "@/config/app";
import { grantTickets } from "@/lib/grantTickets";

export interface UserData {
  id: string;
  phone: string;
  nickname: string;
  email?: string;
  cuan: number;
  tiket: number;
  level: number;
  isNewUser: boolean;
  /** ISO 3166-1 alpha-2 (e.g. ID, TR) */
  countryCode?: string;
}

/** Where to send the user after a successful login from the global LoginSheet */
export type LoginRedirectAction = "camera" | "profile" | "rank" | "invite";

type PendingAction = LoginRedirectAction | null;

interface UserContextType {
  user: UserData | null;
  session: Session | null;
  isOnboarded: boolean;
  isLoading: boolean;
  loginWithPhone: (phone: string, nickname: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  loginWithEmail: (email: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (nickname: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  theme: "dark" | "light";
  toggleTheme: () => void;
  pushNotifications: boolean;
  togglePushNotifications: () => void;
  showLoginSheet: boolean;
  pendingAction: PendingAction;
  requireLogin: (action: LoginRedirectAction) => void;
  dismissLogin: () => void;
  authMode: "phone" | "email";
  setAuthMode: (mode: "phone" | "email") => void;
  updateLastSeen: () => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};

async function upsertProfile(userId: string, nickname: string, phone?: string, email?: string) {
  const { error } = await supabase.from("survey_profiles").upsert(
    {
      user_id: userId,
      nickname: nickname,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) console.error("Profile upsert error:", error);
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("struk_theme") as "dark" | "light") || "dark";
  });

  const [pushNotifications, setPushNotifications] = useState(() => {
    return localStorage.getItem("struk_push") !== "false";
  });

  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [authMode, setAuthMode] = useState<"phone" | "email">("phone");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("struk_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (session && showLoginSheet) {
      setShowLoginSheet(false);
      // Keep pendingAction so PostLoginRedirect can navigate before we clear
      // (cleared by PostLoginRedirect after navigation)
    }
  }, [session, showLoginSheet]);

  const buildUserFromSession = useCallback(async (s: Session | null): Promise<UserData | null> => {
    if (!s?.user) return null;
    const u = s.user as SupabaseUser & { phone?: string };
    const userId = u.id;
    const phone = u.phone ?? u.user_metadata?.phone ?? "";
    const email = u.email ?? u.user_metadata?.email ?? "";
    const nickname = u.user_metadata?.nickname ?? u.user_metadata?.display_name ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? "";

    const { data: profile } = await supabase
      .from("survey_profiles")
      .select("user_id, total_tickets, nickname")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: stats } = await supabase
      .from("user_stats")
      .select("tiket, nickname, level, total_receipts, country_code")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      id: userId,
      phone: phone,
      nickname: stats?.nickname ?? (nickname || "User"),
      email: email || undefined,
      cuan: 0,
      tiket: stats?.tiket ?? 0,
      level: stats?.level ?? 1,
      isNewUser: !stats?.nickname,
      countryCode: (stats as { country_code?: string })?.country_code ?? "ID",
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const applyPendingCountry = async (userId: string) => {
      const pending = localStorage.getItem("struk_country_pending");
      if (!pending || !["ID", "DE", "TR"].includes(pending)) return;
      try {
        await supabase.rpc("update_user_country", { p_country_code: pending });
        localStorage.removeItem("struk_country_pending");
      } catch (e) {
        console.warn("Failed to apply pending country:", e);
      }
    };

    const processReferral = async (userId: string) => {
      const code = localStorage.getItem(REFERRAL_STORAGE_KEY);
      if (!code?.trim()) return;

      console.log('[ReferralSignupReward] start', { userId, code });

      // 1. Check if this user was already rewarded for a referral signup
      const { data: userStats } = await supabase
        .from("user_stats")
        .select("referral_signup_rewarded")
        .eq("user_id", userId)
        .maybeSingle();

      if (userStats?.referral_signup_rewarded) {
        console.log('[ReferralSignupReward] already rewarded, skipping');
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        return;
      }

      // 2. Find the referrer
      const { data: referrer } = await supabase
        .from("user_stats")
        .select("user_id")
        .eq("referral_code", code.trim().toUpperCase())
        .single();

      if (!referrer || referrer.user_id === userId) {
        console.log('[ReferralSignupReward] invalid or self-referral', { referrer });
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        return;
      }

      const referrerId = referrer.user_id;

      try {
        // 3. Register the referral in the database
        const { error: insertError } = await supabase.from("referrals").insert({
          referrer_user_id: referrerId,
          referred_user_id: userId,
          reward_given: false, // This is for Stage 2 (receipt) backwards compatibility
        });

        if (insertError) {
          // If insert fails (likely unique constraint on referred_user_id), we stop
          console.log('[ReferralSignupReward] referral already registered or failed', insertError);
          localStorage.removeItem(REFERRAL_STORAGE_KEY);
          return;
        }

        // 4. Grant Stage 1 Rewards
        console.log('[ReferralSignupReward] granting tickets', { referrerId, userId });
        
        // Reward Inviter (+10)
        await grantTickets(referrerId, 10);
        console.log('[ReferralSignupReward] inviter rewarded (+10)');

        // Reward New User (+3)
        await grantTickets(userId, 3);
        console.log('[ReferralSignupReward] new user rewarded (+3)');

        // 5. Update user_stats with signup reward flags
        await supabase
          .from("user_stats")
          .update({
            referral_signup_rewarded: true,
            referral_signup_rewarded_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        console.log('[ReferralSignupReward] success');
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      } catch (error) {
        console.error('[ReferralSignupReward] error', error);
      }
    };

    const applySession = async (session: Session | null) => {
      if (!mounted) return;
      setSession(session);
      if (session) {
        const u = session.user as SupabaseUser & { phone?: string };
        const displayName = u.user_metadata?.display_name ?? u.user_metadata?.nickname ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? (u.email ? "User" : "");
        if (displayName || u.email) {
          await upsertProfile(u.id, displayName || "User", u.phone ?? undefined, u.email ?? undefined);
        }
        await applyPendingCountry(u.id);
        processReferral(u.id).catch(() => {});
        const userData = await buildUserFromSession(session);
        if (mounted) setUser(userData);
      } else {
        setUser(null);
      }
    };

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        await applySession(session);
      } catch (err) {
        console.warn("Session restore error:", err);
        if (mounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        if (session) {
          applyPendingCountry(session.user.id)
            .catch(() => {})
            .then(() => {
              processReferral(session.user.id).catch(() => {});
              return buildUserFromSession(session);
            })
            .then((userData) => {
              if (mounted) setUser(userData);
            });
        } else {
          setUser(null);
        }
      }
    );

    initSession();

    // Heartbeat logic: Update last_seen_at every 2 minutes
    let heartbeatInterval: NodeJS.Timeout;
    if (session?.user?.id) {
      const updateSeen = async () => {
        try {
          await supabase.rpc('update_last_seen', { p_user_id: session.user.id });
        } catch (e) {
          console.warn('[Heartbeat] failed', e);
        }
      };
      
      updateSeen(); // Initial run
      heartbeatInterval = setInterval(updateSeen, 120000);
    }

    const fallbackTimer = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      mounted = false;
      subscription.unsubscribe();
    };
  }, [buildUserFromSession, session?.user?.id]);

  const updateLastSeen = useCallback(async () => {
    if (!session?.user?.id) return;
    await supabase.rpc('update_last_seen', { p_user_id: session.user.id });
  }, [session?.user?.id]);

  const loginWithPhone = useCallback(async (phone: string, nickname: string) => {
    const fullPhone = phone.startsWith("+") ? phone : `+62${phone.replace(/\D/g, "")}`;
    const { error } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
      options: {
        data: { nickname },
      },
    });
    if (error) throw error;
  }, []);

  const verifyOtp = useCallback(async (phone: string, token: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("62") ? `+${cleanPhone}` : `+62${cleanPhone}`;
    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token,
      type: "sms",
    });
    if (error) throw error;
    if (data.session?.user?.user_metadata?.nickname) {
      await upsertProfile(
        data.session.user.id,
        data.session.user.user_metadata.nickname,
        data.session.user.phone ?? undefined
      );
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, displayName: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { display_name: displayName, nickname: displayName },
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });
    if (error) throw error;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    // On localhost: NEVER redirect to production - always use current origin
    const redirectTo = getAuthRedirectUrl();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const updateProfile = useCallback(async (nickname: string) => {
    if (!session?.user) return;
    await upsertProfile(session.user.id, nickname);
    setUser((prev) => (prev ? { ...prev, nickname } : null));
  }, [session?.user]);

  const refreshUser = useCallback(async () => {
    if (session) {
      const userData = await buildUserFromSession(session);
      setUser(userData);
    }
  }, [session, buildUserFromSession]);

  const requireLogin = useCallback(async (action: LoginRedirectAction) => {
    setPendingAction(action);
    // Localhost: zorunlu anonim giriş - hiçbir yere yönlendirmeden arka planda signInAnonymously
    if (IS_LOCALHOST) {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data.session) {
          setSession(data.session);
          const userData = await buildUserFromSession(data.session);
          setUser(userData);
          // PostLoginRedirect will open camera - no external redirect
          return;
        }
      } catch (e) {
        console.warn("[UserContext] Localhost anonymous sign-in failed:", e);
      }
    }
    setShowLoginSheet(true);
  }, [buildUserFromSession]);

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
        session,
        isOnboarded: !!session || !!user,
        isLoading,
        loginWithPhone,
        verifyOtp,
        loginWithEmail,
        loginWithGoogle,
        logout,
        updateProfile,
        refreshUser,
        theme,
        toggleTheme,
        pushNotifications,
        togglePushNotifications,
        showLoginSheet,
        pendingAction,
        requireLogin,
        dismissLogin,
        authMode,
        setAuthMode,
        updateLastSeen,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
