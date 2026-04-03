import { useState, useEffect, useCallback } from "react";

// LocalStorage keys for tracking notification state
const NOTIFICATION_PROMPT_SHOWN_KEY = "struk_notif_prompt_shown";
const NOTIFICATION_PERMISSION_KEY = "struk_notif_permission";
const NOTIFICATION_ENABLED_KEY = "struk_notif_enabled";

/**
 * Check if the browser supports the Notification API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get the current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
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
export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    getNotificationPermission()
  );
  const [enabled, setEnabled] = useState<boolean>(() => {
    return localStorage.getItem(NOTIFICATION_ENABLED_KEY) === "true";
  });
  const [isSupported, setIsSupported] = useState<boolean>(isNotificationSupported());

  // Update permission status when it changes
  useEffect(() => {
    const checkPermission = () => {
      const newPermission = getNotificationPermission();
      setPermission(newPermission);
      setIsSupported(isNotificationSupported());
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

  /**
   * Enable notifications by requesting permission
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

      // Show test notification
      showTestNotification();
      return true;
    }

    // If denied, remember that we shouldn't ask again
    if (result === "denied") {
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "denied");
      setEnabled(false);
    }

    return false;
  }, []);

  /**
   * Disable notifications (toggle off in settings)
   */
  const disableNotifications = useCallback((): void => {
    localStorage.setItem(NOTIFICATION_ENABLED_KEY, "false");
    setEnabled(false);
  }, []);

  /**
   * Toggle notifications on/off
   */
  const toggleNotifications = useCallback(async (): Promise<boolean> => {
    if (enabled) {
      disableNotifications();
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
    isEnabled,
    enableNotifications,
    disableNotifications,
    toggleNotifications,
    notify,
    showTestNotification,
    shouldAutoPrompt,
    markPromptShown,
  };
}
