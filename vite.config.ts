import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from "path";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
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