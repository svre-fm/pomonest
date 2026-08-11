import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,         
    port: 5173,         
    watch: {
      usePolling: true, 
    },
    hmr: {
      host: process.env.VITE_HMR_HOST,
      protocol: process.env.VITE_HMR_PROTOCOL,
      clientPort: Number(process.env.VITE_HMR_PORT),
    },
    allowedHosts: ['fsg12.cpecmu.com'],

    proxy: {
      '/api': {
        target: 'http://backend:3001/',
        changeOrigin: true,
        secure: false,
      }
    }

  }
})