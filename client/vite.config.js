import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    strictPort: true,
    // Dev-only stand-in for production, where Express serves this bundle and
    // the API from one origin. Keeping them same-origin here too means no CORS
    // and no client/server URL pair to keep in sync.
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})