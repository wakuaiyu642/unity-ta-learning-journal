import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base =
  process.env.VITE_BASE_PATH ??
  (repository && !repository.endsWith(".github.io") ? `/${repository}/` : "/");

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "成长管线 · Growth Pipeline",
        short_name: "成长管线",
        description: "Unity 技术美术成长规划、个人主页与作品集",
        theme_color: "#123f3a",
        background_color: "#f6f2e9",
        display: "standalone",
        start_url: ".",
        scope: ".",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        globIgnores: ["media/og-cover.png"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin.includes("supabase.co") &&
              url.pathname.includes("/storage/v1/object/public/"),
            handler: "CacheFirst",
            options: {
              cacheName: "learning-attachments",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"]
  }
});
