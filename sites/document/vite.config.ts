import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss()
  ],
  css: {
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    alias: {
      '@styles': path.resolve(__dirname, '../../styles'),
      '@wps/input': path.resolve(__dirname, '../../packages/@wps/input/src'),
      '@wps/layout': path.resolve(__dirname, '../../packages/@wps/layout/src'),
      '@wps/scripts': path.resolve(__dirname, '../../packages/@wps/scripts/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) {
            return
          }

          const groups: Record<string, string[]> = {
            'react-vendor': ['react', 'react-dom'],
            'react-router': ['react-router-dom'],
            msal: ['@azure/msal-browser', '@azure/msal-react'],
            'document-gen': ['docxtemplater', 'pizzip', 'file-saver'],
            markdown: ['react-markdown', 'remark-gfm', 'rehype-slug'],
            headless: ['@headlessui/react'],
            lucide: ['lucide-react'],
            gis: ['leaflet', 'react-leaflet', 'papaparse'],
          }

          for (const [chunkName, packages] of Object.entries(groups)) {
            if (packages.some((pkg) => id.includes(`/node_modules/${pkg}/`) || id.includes(`\\node_modules\\${pkg}\\`) || id.includes(`/node_modules/.pnpm/${pkg.replace('/', '+')}@`) || id.includes('react/jsx-runtime'))) {
              return chunkName
            }
          }

          return 'vendor'
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
