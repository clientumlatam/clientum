import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

const rawPort = process.env.VITE_PORT ?? process.env.PORT;

if (!rawPort) {
  throw new Error(
    "VITE_PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid VITE_PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: {
        enabled: false,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 30 },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\//,
            handler: "CacheFirst",
            options: {
              cacheName: "cdn-assets",
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30, maxEntries: 20 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 30, maxEntries: 60 },
            },
          },
        ],
      },
      manifest: {
        name: "Clientum — IA para PyMEs",
        short_name: "Clientum",
        description: "Automatizá la atención al cliente de tu PyME con IA: chatbot 24/7 para WhatsApp, CRM inteligente y reportes automáticos.",
        theme_color: "#031E43",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        lang: "es-AR",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
    ...(!isProduction && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "wouter",
      "@tanstack/react-query",
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
    ],
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    target: "es2020",
    cssCodeSplit: true,
    reportCompressedSize: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // React core — isolated so browser caches it independently
          if (id.includes("/react-dom/") || (id.includes("/react/") && !id.includes("react-hook-form")) || id.includes("/scheduler/")) return "react";

          // Animation — loaded lazily by framer-motion consumers
          if (id.includes("framer-motion") || id.includes("popmotion") || id.includes("hey-listen")) return "motion";

          // Charts — heavy, only on analytics/overview pages
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-")) return "charts";

          // Icons — served from CDN but if bundled, isolate it
          if (id.includes("lucide-react")) return "lucide";

          // Radix UI primitives
          if (id.includes("@radix-ui")) return "radix";

          // TanStack (React Query, Table, Virtual)
          if (id.includes("@tanstack")) return "tanstack";

          // PDF generation — very heavy, only used for receipts
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("dompurify")) return "pdf";

          // CSV — only used in export pages
          if (id.includes("papaparse") || id.includes("csv-parse")) return "csv";

          // Form libraries
          if (id.includes("react-hook-form") || id.includes("@hookform")) return "forms";

          // Validation
          if (id.includes("/zod/")) return "zod";

          // Date utilities
          if (id.includes("date-fns") || id.includes("dayjs") || id.includes("luxon")) return "dates";

          // Command palette
          if (id.includes("cmdk")) return "cmdk";

          // Smaller UI extras (sonner toasts, drawers, OTP inputs, carousels)
          if (id.includes("sonner") || id.includes("vaul") || id.includes("input-otp") || id.includes("embla")) return "ui-extras";

          // Routing + className utilities (tiny, load fast)
          if (id.includes("wouter") || id.includes("/clsx/") || id.includes("tailwind-merge") || id.includes("class-variance-authority")) return "utils";

          // Remaining vendor — much smaller now that main libs are extracted
          return "vendor";
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
