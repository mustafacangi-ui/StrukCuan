import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, X } from "lucide-react";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  shouldAutoPrompt,
  markPromptShown,
  showTestNotification,
} from "@/hooks/useBrowserNotifications";

/**
 * Auto-prompt for notification permission on app load
 * Shows a banner asking user to enable notifications
 * Only shows once (tracked via localStorage)
 */
export function NotificationAutoPrompt() {
  const { t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if we should show the auto-prompt
    const checkPrompt = () => {
      if (!isNotificationSupported()) return;
      if (!shouldAutoPrompt()) return;

      // Small delay to not interrupt app load
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    };

    checkPrompt();
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    markPromptShown();

    const permission = await requestNotificationPermission();

    if (permission === "granted") {
      showTestNotification();
    }

    setShowPrompt(false);
    setIsRequesting(false);
  };

  const handleDismiss = () => {
    markPromptShown();
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-top duration-300">
      <div
        className="max-w-[420px] mx-auto rounded-2xl p-4 shadow-2xl"
        style={{
          background: "rgba(15, 15, 25, 0.98)",
          border: "1px solid rgba(155, 92, 255, 0.4)",
          boxShadow: "0 0 30px rgba(155, 92, 255, 0.3), 0 4px 20px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
            style={{
              background: "rgba(155, 92, 255, 0.2)",
              border: "1px solid rgba(155, 92, 255, 0.3)",
            }}
          >
            <Bell size={18} className="text-[#9b5cff]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-white text-sm">
              {t("notifications.autoPromptTitle", "Enable Notifications")}
            </h3>
            <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
              {t(
                "notifications.autoPromptDesc",
                "Get instant alerts for new promos, rewards, and weekly draw results!"
              )}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={isRequesting}
                className="flex-1 rounded-xl py-2 px-3 text-xs font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #9b5cff 0%, #7c3aed 100%)",
                  boxShadow: "0 0 15px rgba(155, 92, 255, 0.4)",
                }}
              >
                {isRequesting ? (
                  <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  t("notifications.enable", "Enable")
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-xs font-medium text-white/50 hover:text-white/80 transition-colors"
              >
                {t("common.notNow", "Not now")}
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-white/40 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
