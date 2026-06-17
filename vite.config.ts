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
        target: process.env.VITE_API_TARGET || 'http://localhost:8060',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8060',
        changeOrigin: true,
      },
      '/outputs': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8060',
        changeOrigin: true,
      },
      '/ws': {
        target: (process.env.VITE_API_TARGET || 'http://localhost:8060').replace('http', 'ws'),
        ws: true,
      },
    },
  },
})
