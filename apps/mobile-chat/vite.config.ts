import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    headers: {
      // Allow embedding as iframe from the web app (same origin or localhost dev)
      'X-Frame-Options': 'ALLOWALL',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          markdown: ['react-markdown', 'react-syntax-highlighter'],
          state: ['zustand', 'idb', '@tanstack/react-query'],
        },
      },
    },
  },
})
