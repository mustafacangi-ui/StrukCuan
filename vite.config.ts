import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from "vite";

/**
 * Converts every Vite-injected `<link rel="stylesheet">` tag to the
 * non-blocking "print media trick" pattern, so extracted CSS never sits
 * in the critical rendering path.
 *
 * Applied *after* Vite's own HTML transforms (order: "post") so the
 * selector reliably matches the already-injected tags.
 *
 * For the app to remain visually correct during the brief gap between
 * HTML parse and CSS application, the inline critical CSS in index.html
 * covers the loading shell; the Tailwind stylesheet typically arrives
 * before React renders (JS is 5–10× larger).
 */
function deferExtractedCssPlugin(): Plugin {
  return {
    name: "defer-extracted-css",
    transformIndexHtml: {
      order: "post",
      handler(html: string) {
        // Match Vite-injected stylesheet links for hashed assets only
        return html.replace(
          /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
          (_, href) =>
            `<link rel="preload" as="style" crossorigin href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
            `<noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`
        );
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && deferExtractedCssPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    // Suppress the warning for the large lazy map chunk
    chunkSizeWarningLimit: 2200,
    rollupOptions: {
      output: {
        /**
         * Vendor chunk strategy (mapbox-gl intentionally excluded):
         *
         *   vendor-react    ~185 KB  — react + react-dom + react-router
         *   vendor-query     ~39 KB  — @tanstack/react-query
         *   vendor-supabase ~174 KB  — @supabase/supabase-js
         *   vendor-radix     ~92 KB  — @radix-ui/* primitives
         *   vendor-misc      ~83 KB  — sonner, date-fns, i18next, etc.
         *
         * mapbox-gl + react-map-gl are NOT listed here on purpose.
         * When they live in a manualChunks entry, Vite adds the chunk to
         * the entry's modulepreload list — preloading 1.7 MB of mapbox on
         * EVERY page, even the home screen.  By letting Rollup bundle them
         * naturally inside the lazy /radar chunk, they are only downloaded
         * when the user actually navigates to the map.
         */
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;

          // mapbox-gl / react-map-gl → intentionally omitted (stay in lazy Map chunk)

          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("react-router")
          )
            return "vendor-react";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (
            id.includes("sonner") ||
            id.includes("date-fns") ||
            id.includes("i18next") ||
            id.includes("react-i18next")
          )
            return "vendor-misc";

          return undefined;
        },
      },
    },
  },
}));
