import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from "path";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../shared"),
      "@assets": path.resolve(__dirname, "../attached_assets"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://international-patience-promconsulting-b5fd18f5.koyeb.app',
        changeOrigin: true,
      }
    }
  }, 
});