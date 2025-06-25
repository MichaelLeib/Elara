import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import config from "./src/assets/config.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
      babel: {
        plugins: ["@emotion/babel-plugin"],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: config.URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
