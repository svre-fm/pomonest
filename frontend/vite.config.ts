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
      clientPort: 6012, // บอก Vite ให้ส่งสัญญาณรีเฟรชไปที่พอร์ต 6012 หน้าเว็บ
    }
  }
})