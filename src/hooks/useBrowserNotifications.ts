import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// LocalStorage keys for tracking notification state
const NOTIFICATION_PROMPT_SHOWN_KEY = "struk_notif_prompt_shown";
const NOTIFICATION_PERMISSION_KEY = "struk_notif_permission";
const NOTIFICATION_ENABLED_KEY = "struk_notif_enabled";
const PUSH_SUBSCRIPTION_ID_KEY = "struk_push_subscription_id";

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Check if the browser supports the Notification API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Check if the browser supports Push API
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * Convert base64 string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Get the current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Register the service worker for push notifications
 * Forces update check on every registration to ensure latest version
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    console.log("[Push] Push API not supported");
    return null;
  }

  try {
    console.log("[Push] Registering service worker...");
    const registration = await navigator.serviceWorker.register("/sw.js", {
      updateViaCache: "none", // Force network check for updates
    });
    console.log("[Push] Service Worker registered:", registration);

    // Force update check immediately
    registration.update().catch((err) => {
      console.log("[Push] Service worker update check failed:", err);
    });

    // Listen for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[Push] New service worker available, activating...");
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error("[Push] Service Worker registration failed:", error);
    return null;
  }
}

/**
 * Subscribe to push notifications using PushManager
 */
export async function subscribeToPush(
  userId: string
): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  console.log("[Push] Starting push subscription...", { userId });

  if (!isPushSupported()) {
    console.log("[Push] Push API not supported");
    return { success: false, error: "Push API not supported" };
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error("[Push] VAPID public key not configured");
    return { success: false, error: "VAPID public key not configured" };
  }

  console.log("[Push] VAPID key check:", {
    exists: true,
    length: VAPID_PUBLIC_KEY.length,
    preview: `${VAPID_PUBLIC_KEY.substring(0, 20)}...`,
  });

  try {
    console.log("[Push] VAPID key validation passed");
    console.log("[Push] Getting service worker registration...");

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    console.log("[Push] Service Worker ready:", {
      scope: registration.scope,
      active: !!registration.active,
      installing: !!registration.installing,
      waiting: !!registration.waiting,
    });

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    console.log("[Push] Existing subscription:", existingSubscription);

    if (existingSubscription) {
      console.log("[Push] Already subscribed, checking if saved to database");

      // Check if this subscription exists in database
      const { data: existingSub, error: checkError } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("endpoint", existingSubscription.endpoint)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        console.error("[Push] Error checking existing subscription:", checkError);
      }

      if (existingSub) {
        console.log("[Push] Subscription already saved in database:", existingSub.id);
        localStorage.setItem(PUSH_SUBSCRIPTION_ID_KEY, existingSub.id);
        return { success: true, subscription: existingSubscription };
      }

      // Subscription exists but not in database, save it
      console.log("[Push] Subscription exists but not in database, saving...");
    }

    // Subscribe to push
    console.log("[Push] Subscribing with VAPID key...");
    let subscription: PushSubscription;
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
    } catch (subscribeError) {
      console.error("[Push] pushManager.subscribe() failed:", subscribeError);
      throw subscribeError;
    }

    console.log("[Push] Push subscription result:", {
      success: true,
      endpoint: subscription.endpoint.substring(0, 50) + "...",
      expirationTime: subscription.expirationTime,
    });

    // Extract subscription data
    const endpoint = subscription.endpoint;
    const p256dh = subscription.toJSON().keys?.p256dh;
    const auth = subscription.toJSON().keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      throw new Error("Invalid subscription data");
    }

    console.log("[Push] Subscription keys extracted:", {
      endpoint: endpoint.substring(0, 50) + "...",
      hasP256dh: !!p256dh,
      hasAuth: !!auth,
    });

    // Save to database
    console.log("[Push] Inserting into Supabase push_subscriptions...");
    const { data: savedSub, error: saveError } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
        },
        { onConflict: "endpoint" }
      )
      .select("id")
      .single();

    console.log("[Push] Supabase insert result:", { savedSub, saveError: saveError?.message, code: saveError?.code });

    if (saveError) {
      console.error("[Push] Failed to save subscription:", saveError);
      return { success: false, error: saveError.message };
    }

    console.log("[Push] Subscription saved successfully:", savedSub.id);
    localStorage.setItem(PUSH_SUBSCRIPTION_ID_KEY, savedSub.id);

    return { success: true, subscription };
  } catch (error) {
    console.error("[Push] Subscription failed:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: "Push API not supported" };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Delete from database first
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);

      if (deleteError) {
        console.error("[Push] Failed to delete subscription from database:", deleteError);
      }

      // Unsubscribe from push manager
      await subscription.unsubscribe();
      console.log("[Push] Unsubscribed successfully");
    }

    localStorage.removeItem(PUSH_SUBSCRIPTION_ID_KEY);
    return { success: true };
  } catch (error) {
    console.error("[Push] Unsubscribe failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Unregister all service workers and clear all caches
 * Use this to force a clean slate when stale assets are being served
 */
export async function unregisterAllServiceWorkers(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Unregister all service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    const unregisterPromises = registrations.map((reg) => {
      console.log("[SW Cleanup] Unregistering:", reg.scope);
      return reg.unregister();
    });
    await Promise.all(unregisterPromises);

    // Clear all caches
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      const cacheClearPromises = cacheNames.map((name) => {
        console.log("[SW Cleanup] Deleting cache:", name);
        return caches.delete(name);
      });
      await Promise.all(cacheClearPromises);
    }

    // Clear localStorage keys related to service workers
    localStorage.removeItem(PUSH_SUBSCRIPTION_ID_KEY);

    return {
      success: true,
      message: `Unregistered ${registrations.length} service worker(s) and cleared ${(await caches.keys()).length} cache(s). Reload the page to get fresh assets.`,
    };
  } catch (error) {
    console.error("[SW Cleanup] Failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error during cleanup",
    };
  }
}

/**
 * Request notification permission from the user
 * Returns the permission status after the request
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error("[Notifications] Error requesting permission:", error);
    return Notification.permission;
  }
}

/**
 * Show a test notification to verify notifications are working
 */
export function showTestNotification(): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const notification = new Notification("StrukCuan", {
      body: "Notifications are now enabled",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "test-notification",
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return true;
  } catch (error) {
    console.error("[Notifications] Error showing test notification:", error);
    return false;
  }
}

/**
 * Send a custom notification
 */
export function sendNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!isNotificationSupported()) return null;
  if (Notification.permission !== "granted") return null;

  try {
    const notification = new Notification(title, {
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      ...options,
    });
    return notification;
  } catch (error) {
    console.error("[Notifications] Error sending notification:", error);
    return null;
  }
}

/**
 * Check if we should auto-prompt for notification permission
 * Only prompt once unless user denied (in which case we never prompt again automatically)
 */
export function shouldAutoPrompt(): boolean {
  if (!isNotificationSupported()) return false;

  // If permission is already granted or denied by system, don't prompt
  if (Notification.permission === "granted") return false;
  if (Notification.permission === "denied") return false;

  // Check if we've already shown the prompt once
  const promptShown = localStorage.getItem(NOTIFICATION_PROMPT_SHOWN_KEY);
  if (promptShown === "true") return false;

  return true;
}

/**
 * Mark that we've shown the auto-prompt
 */
export function markPromptShown(): void {
  localStorage.setItem(NOTIFICATION_PROMPT_SHOWN_KEY, "true");
}

/**
 * Hook for managing browser push notifications
 */
export function useBrowserNotifications(userId?: string) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    getNotificationPermission()
  );
  const [enabled, setEnabled] = useState<boolean>(() => {
    return localStorage.getItem(NOTIFICATION_ENABLED_KEY) === "true";
  });
  const [isSupported, setIsSupported] = useState<boolean>(isNotificationSupported());
  const [isPushApiSupported, setIsPushApiSupported] = useState<boolean>(isPushSupported());
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);

  // Update permission status when it changes
  useEffect(() => {
    const checkPermission = () => {
      const newPermission = getNotificationPermission();
      setPermission(newPermission);
      setIsSupported(isNotificationSupported());
      setIsPushApiSupported(isPushSupported());
    };

    // Check initially
    checkPermission();

    // Listen for permission changes (some browsers support this)
    if (isNotificationSupported()) {
      navigator.permissions?.query({ name: "notifications" as PermissionName })
        .then((permissionStatus) => {
          permissionStatus.onchange = checkPermission;
        })
        .catch(() => {
          // Fallback: check periodically
          const interval = setInterval(checkPermission, 1000);
          return () => clearInterval(interval);
        });
    }
  }, []);

  // Auto-subscribe to push when permission is granted and we have a user
  useEffect(() => {
    const autoSubscribe = async () => {
      if (permission === "granted" && userId && isPushApiSupported && !isSubscribing) {
        // Check if already subscribed
        const existingSubId = localStorage.getItem(PUSH_SUBSCRIPTION_ID_KEY);
        if (existingSubId) {
          console.log("[useBrowserNotifications] Already subscribed, skipping auto-subscribe");
          return;
        }

        setIsSubscribing(true);
        console.log("[useBrowserNotifications] Auto-subscribing to push...");

        try {
          const result = await subscribeToPush(userId);
          if (result.success) {
            console.log("[useBrowserNotifications] Auto-subscribe successful");
            localStorage.setItem(NOTIFICATION_ENABLED_KEY, "true");
            setEnabled(true);
          } else {
            console.error("[useBrowserNotifications] Auto-subscribe failed:", result.error);
          }
        } catch (error) {
          console.error("[useBrowserNotifications] Auto-subscribe error:", error);
        } finally {
          setIsSubscribing(false);
        }
      }
    };

    autoSubscribe();
  }, [permission, userId, isPushApiSupported, isSubscribing]);

  /**
   * Enable notifications by requesting permission and subscribing to push
   */
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!isNotificationSupported()) {
      return false;
    }

    const result = await requestNotificationPermission();
    setPermission(result);

    if (result === "granted") {
      localStorage.setItem(NOTIFICATION_ENABLED_KEY, "true");
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "granted");
      setEnabled(true);

      // Subscribe to push if userId is available
      if (userId && isPushApiSupported) {
        console.log("[useBrowserNotifications] Enabling notifications - subscribing to push");
        setIsSubscribing(true);

        try {
          const subResult = await subscribeToPush(userId);
          if (subResult.success) {
            console.log("[useBrowserNotifications] Push subscription successful");
          } else {
            console.error("[useBrowserNotifications] Push subscription failed:", subResult.error);
          }
        } catch (error) {
          console.error("[useBrowserNotifications] Push subscription error:", error);
        } finally {
          setIsSubscribing(false);
        }
      }

      // Show test notification
      showTestNotification();
      return true;
    }

    if (result === "denied") {
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "denied");
      setEnabled(false);
    }

    return false;
  }, [userId, isPushApiSupported]);

  /**
   * Disable notifications (toggle off in settings)
   */
  const disableNotifications = useCallback(async (): Promise<void> => {
    localStorage.setItem(NOTIFICATION_ENABLED_KEY, "false");
    setEnabled(false);

    // Unsubscribe from push
    if (isPushApiSupported) {
      console.log("[useBrowserNotifications] Disabling notifications - unsubscribing from push");
      try {
        await unsubscribeFromPush();
      } catch (error) {
        console.error("[useBrowserNotifications] Unsubscribe error:", error);
      }
    }
  }, [isPushApiSupported]);

  /**
   * Toggle notifications on/off
   */
  const toggleNotifications = useCallback(async (): Promise<boolean> => {
    if (enabled) {
      await disableNotifications();
      return false;
    } else {
      return await enableNotifications();
    }
  }, [enabled, enableNotifications, disableNotifications]);

  /**
   * Check if notifications are currently enabled and permitted
   */
  const isEnabled = permission === "granted" && enabled;

  /**
   * Send a notification if enabled
   */
  const notify = useCallback(
    (title: string, options?: NotificationOptions): Notification | null => {
      if (!isEnabled) return null;
      return sendNotification(title, options);
    },
    [isEnabled]
  );

  return {
    permission,
    enabled,
    isSupported,
    isPushApiSupported,
    isEnabled,
    isSubscribing,
    enableNotifications,
    disableNotifications,
    toggleNotifications,
    notify,
    showTestNotification,
    shouldAutoPrompt,
    markPromptShown,
    subscribeToPush,
    unsubscribeFromPush,
    unregisterAllServiceWorkers,
  };
}
