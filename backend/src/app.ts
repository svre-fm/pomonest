import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import { desc, eq, or, type SQL } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import {
  users,
  categories,
  tasks,
  activities,
  eggs,
  userEggs,
  focusSessions,
  animals,
  eggRewards,
  userAnimals,
} from "@db/schema.js";
import cors from "cors";
import { hashPassword, verifyPassword } from "./auth/password.js";
import {randomUUID} from "node:crypto";
import { sendVerificationEmail } from "./service/mail.service.js";
import { startCleanupJob } from "./jobs/cleanup-unverified-users.js";

const PORTFRONT = process.env.FRONTEND_PORT || 6012;

// อ้างอิงตารางข้อมูลทั้งหมดตาม schema ของเพื่อน
const dataTables = {
  users,
  categories,
  tasks,
  activities,
  eggs,
  userEggs,
  focusSessions,
  animals,
  eggRewards,
  userAnimals,
} as const;

type UserRecord = typeof users.$inferSelect;

function formatUser(user: UserRecord) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

const app = express();

app.use(
  cors({
    origin: [
      `http://localhost:${PORTFRONT}`,
      "http://fsg12.cpecmu.com",
      "https://fsg12.cpecmu.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.options(/.*/, cors());

app.use(express.json());

// ==========================================
// API: สมัครสมาชิก
// ==========================================
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password, avatar } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "username, email และ password จำเป็นต้องกรอก",
      });
    }

    const existing = await dbClient
      .select({ 
        id: users.id,
        emailVerified: users.emailVerified
      })
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, username)))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: "email หรือ username ถูกใช้แล้ว" });
    }

    const token = randomUUID();

    const hashedPassword = await hashPassword(password);

    const [newUser] = await dbClient
      .insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
        avatar: avatar ?? null,

        emailVerified: false,
        verificationToken: token,
        verificationExpire: new Date(Date.now() + 5 * 60 * 1000),
      })
      .returning();
      console.log(new Date(Date.now() + 5 * 60 * 1000));

    //send token to email
    await sendVerificationEmail(email, token);

    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี",
      data: formatUser(newUser),
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "ไม่สามารถสมัครสมาชิกได้" });
  }
});

// ==========================================
// API: ยืนยัน Email
// ==========================================
app.get("/api/auth/verify", async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).send("Invalid token");
    }

    const [user] = await dbClient
      .select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);

    if (!user) {
      return res.status(400).send("Token ไม่ถูกต้องหรือหมดอายุ");
    }

    if (user.emailVerified) {
      return res.send("Email นี้ได้รับการยืนยันแล้ว");
    }

    if (
      user.verificationExpire &&
      user.verificationExpire < new Date()
    ) {
      return res
        .status(400)
        .send("Token หมดอายุ กรุณาสมัครใหม่");
    }

    await dbClient
      .update(users)
      .set({
        emailVerified: true,
        verificationToken: null,
        verificationExpire: null,
      })
      .where(eq(users.id, user.id));

    return res.redirect(
      `${process.env.FRONTEND_URL}/verify-success`
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Verify failed");
  }
});

// ==========================================
// API: ล็อกอิน (รองรับ id / username / email + password)
// ==========================================
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { id, username, email, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "password จำเป็นต้องกรอก" });
    }

    if (!id && !username && !email) {
      return res.status(400).json({
        error: "ต้องระบุ id, username หรือ email อย่างน้อย 1 อย่าง",
      });
    }

    const conditions: SQL[] = [];
    if (id) conditions.push(eq(users.id, id));
    if (username) conditions.push(eq(users.username, username));
    if (email) conditions.push(eq(users.email, email));

    const [user] = await dbClient
      .select()
      .from(users)
      .where(or(...conditions))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: "ไม่พบผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ",
    });
    }

    res.status(200).json({
      message: "ล็อกอินสำเร็จ",
      data: formatUser(user),
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "ไม่สามารถล็อกอินได้" });
  }
});

// ==========================================
// API: ดึงข้อมูลผู้ใช้ตาม id
// ==========================================
app.get("/api/auth/user/:id", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.id);

    const [user] = await dbClient
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.emailVerified) {
    return res.send("Email นี้ได้รับการยืนยันแล้ว");
    }

    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้" });
    }

    res.status(200).json({
      message: "ดึงข้อมูลผู้ใช้สำเร็จ",
      data: formatUser(user),
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลผู้ใช้ได้" });
  }
});

// ==========================================
// API: รายชื่อตารางข้อมูลที่ backend รองรับ
// ==========================================
app.get("/api/data/tables", (_req: Request, res: Response) => {
  const tables = Object.entries(dataTables).map(([name, table]) => ({
    name,
    columns: Object.keys(table),
  }));

  res.status(200).json({
    message: "รายชื่อตารางข้อมูล",
    data: tables,
  });
});

// ==========================================
// API 1: บันทึกประวัติการจับเวลา (เรียกตอนกด Stop)
// ==========================================
app.post("/api/timer/save", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      taskId,
      activityId,
      userEggId,
      startTime,
      endTime,
      duration,
      status,
    } = req.body;

    const newSession = await dbClient
      .insert(focusSessions)
      .values({
        userId,
        taskId: taskId ?? null,
        activityId: activityId ?? null,
        userEggId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration,
        status: status || "completed",
      })
      .returning();

    res.status(201).json({
      message: "Focus session saved successfully!",
      data: {
        id: newSession[0].id,
        userId: newSession[0].userId,
        taskId: newSession[0].taskId,
        activityId: newSession[0].activityId,
        userEggId: newSession[0].userEggId,
        startTime: newSession[0].startTime.toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
        }),
        endTime: newSession[0].endTime.toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
        }),
        duration: newSession[0].duration,
        status: newSession[0].status,
        createdAt: newSession[0].createdAt,
      },
    });
  } catch (error) {
    console.error("Error saving session:", error);
    res.status(500).json({ error: "Failed to save session" });
  }
});

// ==========================================
// API 2: ดึงประวัติการจับเวลาทั้งหมด
// ==========================================
app.get("/api/timer/history", async (req: Request, res: Response) => {
  try {
    const history = await dbClient
      .select()
      .from(focusSessions)
      .orderBy(desc(focusSessions.id));

    res.status(200).json({
      message: "History fetched successfully!",
      data: history,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ==========================================
// เริ่มการทำงานของ Server
// ==========================================
const PORT = process.env.BACKEND_PORT || 3001;

startCleanupJob();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
