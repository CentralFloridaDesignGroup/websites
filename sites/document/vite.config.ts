import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@styles": path.resolve(__dirname, "../../styles"),
      "cfdg/input": path.resolve(__dirname, "../../packages/cfdg/input/src"),
      "cfdg/layout": path.resolve(__dirname, "../../packages/cfdg/layout/src"),
      "cfdg/scripts": path.resolve(
        __dirname,
        "../../packages/cfdg/scripts/src",
      ),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          const normalizedId = id.replace(/\\/g, "/");
          if (
            normalizedId.includes("/node_modules/react/") ||
            normalizedId.includes("/node_modules/react-dom/")
          ) {
            return "react-vendor";
          }
          if (normalizedId.includes("/node_modules/@stripe/"))
            return "stripe-vendor";
          if (
            normalizedId.includes("/node_modules/@azure/msal-") ||
            normalizedId.includes("/node_modules/.pnpm/@azure+msal-")
          )
            return "auth-vendor";
          if (
            normalizedId.includes("/node_modules/react-router") ||
            normalizedId.includes("/node_modules/.pnpm/react-router")
          )
            return "router-vendor";
          if (
            normalizedId.includes("/node_modules/@headlessui/") ||
            normalizedId.includes("/node_modules/.pnpm/@headlessui+") ||
            normalizedId.includes("/node_modules/@floating-ui/") ||
            normalizedId.includes("/node_modules/.pnpm/@floating-ui+") ||
            normalizedId.includes("/node_modules/lucide-react") ||
            normalizedId.includes("/node_modules/.pnpm/lucide-react")
          )
            return "ui-vendor";
          if (
            normalizedId.includes("/node_modules/leaflet") ||
            normalizedId.includes("/node_modules/react-leaflet")
          )
            return "map-vendor";
          if (
            normalizedId.includes("/node_modules/exceljs") ||
            normalizedId.includes("/node_modules/jszip") ||
            normalizedId.includes("/node_modules/fast-csv") ||
            normalizedId.includes("/node_modules/saxes")
          )
            return "spreadsheet-vendor";
          if (
            normalizedId.includes("/node_modules/jspdf") ||
            normalizedId.includes("/node_modules/docx") ||
            normalizedId.includes("/node_modules/docxtemplater") ||
            normalizedId.includes("/node_modules/pizzip")
          )
            return "document-vendor";
          if (
            normalizedId.includes("/node_modules/react-markdown") ||
            normalizedId.includes("/node_modules/remark-") ||
            normalizedId.includes("/node_modules/rehype-")
          )
            return "markdown-vendor";
          if (
            normalizedId.includes("/node_modules/proj4") ||
            normalizedId.includes("/node_modules/mgrs") ||
            normalizedId.includes("/node_modules/wkt-parser")
          )
            return "geodesy-vendor";
          if (normalizedId.includes("/node_modules/")) return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
