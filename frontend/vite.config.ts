import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 3000,
    fs: {
      allow: ["./client", "./shared", "index.html"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**"],
    },
    proxy: {
      "/api": {
        target: process.env.VITE_SPRINGBOOT_URL || "http://127.0.0.1:8081",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: process.env.VITE_SPRINGBOOT_URL || "http://127.0.0.1:8081",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./client"),
      "@shared": path.resolve(import.meta.dirname, "./shared"),
    },
  },
});
