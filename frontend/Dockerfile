# ใช้ Node.js version 20
FROM node:20-alpine

# ตั้งค่า working directory ใน container
WORKDIR /app

# ก๊อปปี้ไฟล์ package.json และ package-lock.json เข้าไปก่อน
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# ก๊อปปี้ไฟล์โปรเจกต์ทั้งหมดเข้าไป
COPY . .

# เปิดพอร์ต 5173 สำหรับ Vite
EXPOSE 5173

# รันคำสั่ง start สำหรับ Vite (ต้องใส่ --host เพื่อให้ Docker คุยกับเครื่องเราได้)
CMD ["npm", "run", "dev", "--", "--host"]