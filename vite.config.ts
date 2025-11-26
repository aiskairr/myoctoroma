import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';
import path from "path";

export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'og-preview.png', 'pwa-*.png'],
      manifest: {
        name: 'Octō CRM - Система управления',
        short_name: 'Octō CRM',
        description: 'Управление клиентами и запись на услуги',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: '/pwa-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: '/pwa-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: '/pwa-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: '/pwa-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit for large bundles
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/partial-elfrida-promconsulting-9e3c84f1\.koyeb\.app\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  css: {
    postcss: './postcss.config.js',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://partial-elfrida-promconsulting-9e3c84f1.koyeb.app',
        changeOrigin: true,
        secure: true,
        timeout: 60000, // Увеличиваем timeout до 60 секунд для холодного старта
        proxyTimeout: 60000, // Timeout для прокси запросов
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/ws': {
        target: 'wss://partial-elfrida-promconsulting-9e3c84f1.koyeb.app',
        changeOrigin: true,
        secure: true,
        ws: true,
        timeout: 60000, // Увеличиваем timeout для WebSocket
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('WebSocket proxy error', err);
          });
          proxy.on('proxyReqWs', (_proxyReq, req, _socket) => {
            console.log('Sending WebSocket Request to the Target:', req.url);
          });
        },
      }
    }
  },
});