/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        // Use Docker service name when running in Docker, localhost otherwise
        target: process.env.DOCKER_ENV ? 'http://backend:3000' : 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.DOCKER_ENV ? 'http://backend:3000' : 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  build: {
    sourcemap: true,
    // TEMP: produce a non-minified dev-like bundle so React shows full errors for debugging
    minify: false,
    rollupOptions: {
      // ensure dev build of React is used during this temporary debug build
    },
  },
  define: {
    // Force dev mode for React (temporary, revert after debugging)
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
})