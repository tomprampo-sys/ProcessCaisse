import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Comptage de caisse",
        short_name: "Caisse",
        description: "Comptage de caisse de fin de journée, écart espèces et pochette.",
        lang: "fr",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#f6f4ee",
        theme_color: "#1f4d3a",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"] },
    }),
  ],
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
