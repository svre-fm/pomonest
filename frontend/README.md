# pomonest-frontend

## เริ่มใช้งาน
```
npm install
npm run dev
```
เปิด http://localhost:5173

## หน้าที่มีอยู่
- `/` เข้าสู่ระบบ / สมัครสมาชิก
- `/select-egg` เลือกไข่ (Chicky / Neko / Foxy)
- `/room` My Room (หน้าหลักหลัง login)
- `/focus` โหมดโฟกัส (ตัวจับเวลานับถอยหลังจริง)
- `/stats` สถิติ (กราฟแท่งรายสัปดาห์ + สรุป)
- `/collection` ห้องเก็บสะสม

ตอนนี้ทุกหน้าใช้ mock data ใน `src/data/animals.ts` ยังไม่ได้ต่อ backend/API
เมื่อทีม backend มี endpoint แล้ว ค่อยแทนที่ mock data ด้วย fetch จริง (แนะนำใช้ fetch หรือ axios + react-query)
