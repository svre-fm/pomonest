import 'dotenv/config';
import express from "express";
import type { Request, Response } from "express";
import { desc } from 'drizzle-orm';
// นำเข้าตัวเชื่อมต่อและโครงสร้างตารางจากโฟลเดอร์ db ของเพื่อน
import { dbClient } from '@db/client.js';
import { focusSessions } from '@db/schema.js';
import cors from "cors";

const PORTFRONT = process.env.FRONTEND_PORT || 6012;

const app = express();

app.use(cors({
  origin: [
    `http://localhost:${PORTFRONT}`,
    "http://fsg12.cpecmu.com",
    "https://fsg12.cpecmu.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.options(/.*/, cors());

app.use(express.json());
// ==========================================
// API 1: บันทึกประวัติการจับเวลา (เรียกตอนกด Stop)
// ==========================================
app.post('/api/timer/save', async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, duration, status } = req.body;

    const newSession = await dbClient.insert(focusSessions).values({
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: duration,
      status: status || 'completed'
    }).returning();

    res.status(201).json({
      message: 'Focus session saved successfully!',
      data: {
        ...newSession[0],
        startTime: newSession[0].startTime.toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok"
        }),
        endTime: newSession[0].endTime.toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok"
        })
      }
    });
  } catch (error) {
    console.error("Error saving session:", error);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

// ==========================================
// API 2: ดึงประวัติการจับเวลาทั้งหมด
// ==========================================
app.get('/api/timer/history', async (req: Request, res: Response) => {
  try {
    const history = await dbClient.select()
      .from(focusSessions)
      .orderBy(desc(focusSessions.id));

    res.status(200).json({
      message: 'History fetched successfully!',
      data: history
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ==========================================
// เริ่มการทำงานของ Server
// ==========================================
const PORT = process.env.BACKEND_PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});