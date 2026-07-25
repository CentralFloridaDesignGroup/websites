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
      'cfdg/input': path.resolve(__dirname, '../../packages/cfdg/input/src'),
      'cfdg/layout': path.resolve(__dirname, '../../packages/cfdg/layout/src'),
      'cfdg/scripts': path.resolve(__dirname, '../../packages/cfdg/scripts/src'),
    },
  },
})
