import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers for better tree-shaking and smaller output
    target: "es2020",
    rollupOptions: {
      output: {
        /**
         * Split heavy third-party libraries into their own cacheable chunks.
         * Users only re-download a chunk when that vendor actually changes.
         *
         * Chunk strategy:
         *   vendor-react   ~140 KB  — react + react-dom + react-router
         *   vendor-query    ~35 KB  — @tanstack/react-query
         *   vendor-supabase~200 KB  — @supabase/supabase-js
         *   vendor-map     ~900 KB  — mapbox-gl + react-map-gl (lazy via /radar)
         *   vendor-radix    ~80 KB  — @radix-ui/* primitives
         *   vendor-misc     ~60 KB  — sonner, date-fns, i18next, etc.
         */
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("mapbox-gl") || id.includes("react-map-gl")) {
            return "vendor-map";
          }
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("@tanstack/react-query")) {
            return "vendor-query";
          }
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("react-router")
          ) {
            return "vendor-react";
          }
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }
          if (
            id.includes("sonner") ||
            id.includes("date-fns") ||
            id.includes("i18next") ||
            id.includes("react-i18next")
          ) {
            return "vendor-misc";
          }
          return undefined;
        },
      },
    },
  },
}));
