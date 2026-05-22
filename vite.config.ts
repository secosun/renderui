import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8050,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8060',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8060',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8060',
        ws: true,
      },
    },
  },
})
