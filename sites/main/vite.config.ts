import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@styles': path.resolve(__dirname, '../../styles'),
      '@wps/input': path.resolve(__dirname, '../../packages/@wps/input/src'),
      '@wps/layout': path.resolve(__dirname, '../../packages/@wps/layout/src'),
      '@wps/scripts': path.resolve(__dirname, '../../packages/@wps/scripts/src'),
    },
  },
})
