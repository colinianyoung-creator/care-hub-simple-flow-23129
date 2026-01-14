import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: false, // Use public/manifest.json
      workbox: {
        // Only cache static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Increase limit for large JS bundles
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
        // Exclude API calls and dynamic content
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /supabase/, /\.json$/],
        runtimeCaching: [
          {
            // Cache static assets from same origin only
            urlPattern: ({ request }) => 
              request.destination === 'style' ||
              request.destination === 'script' ||
              request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
