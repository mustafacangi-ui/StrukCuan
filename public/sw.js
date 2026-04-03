// Service Worker for StrukCuan Push Notifications
// Handles push events and displays notifications

const CACHE_NAME = "strukcuan-sw-v1";

// Install event - cache basic assets
self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installing...");
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activating...");
  event.waitUntil(self.clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received:", event);

  if (!event.data) {
    console.log("[SW] Push event has no data");
    return;
  }

  try {
    const data = event.data.json();
    console.log("[SW] Push data:", data);

    const title = data.title || "StrukCuan";
    const options = {
      body: data.body || "You have a new notification!",
      icon: data.icon || "/icon-192.png",
      badge: data.badge || "/icon-192.png",
      tag: data.tag || "default",
      requireInteraction: data.requireInteraction || false,
      data: data.data || {},
      actions: data.actions || [],
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error("[SW] Error handling push event:", error);

    // Fallback notification if JSON parsing fails
    event.waitUntil(
      self.registration.showNotification("StrukCuan", {
        body: "You have a new notification!",
        icon: "/icon-192.png",
      })
    );
  }
});

// Notification click event - handle user clicking notification
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.notification);

  event.notification.close();

  // Open or focus the app
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      })
  );
});

// Message event - handle messages from the main app
self.addEventListener("message", (event) => {
  console.log("[SW] Message received from main app:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

console.log("[SW] Service Worker loaded");
