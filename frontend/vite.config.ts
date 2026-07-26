import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,         // อนุญาตให้ Docker ภายนอกเข้าถึงได้
    port: 5173,         // พอร์ตที่รันโหมด dev
    watch: {
      usePolling: true, // บังคับให้ Vite ตรวจจับการเปลี่ยนแปลงไฟล์ผ่าน Docker
    },
    hmr: {
      host: 'fsg12.cpecmu.com',
      protocol: 'wss',
      clientPort: 443,
    },
    allowedHosts: ['fsg12.cpecmu.com'],

    proxy: {
      '/api': {
        target: 'http://backend:3001/', // ชี้ไปที่ service ชื่อ backend และพอร์ต 3001 ภายใน Docker
        changeOrigin: true,
        secure: false,
      }
    }

  }
})