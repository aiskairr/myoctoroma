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
  // Proxy убран - используем прямые запросы к бэкендам через VITE_BACKEND_URL
  // и VITE_SECONDARY_BACKEND_URL из .env файла
  server: {
    // Оставляем пустым или можно добавить другие настройки сервера
    port: 5173,
    strictPort: false,
    host: true,
  },
});
