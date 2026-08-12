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
import { randomUUID } from "node:crypto";
import { sendVerificationEmail, sendResetPasswordEmail } from "./service/mail.service.js";
import { startCleanupJob } from "./jobs/cleanup-unverified-users.js";
import { signToken } from "./auth/jwt.js";
import { requireAuth } from "./auth/middleware.js";

// In-memory store for reset password tokens (token -> { email, expiresAt })
// In production, move this to Redis or a DB table
const resetTokenStore = new Map<string, { email: string; expiresAt: Date }>();

const PORTFRONT = process.env.FRONTEND_PORT || 6012;

const frontendUrl =
      process.env.FRONTEND_URL || `http://localhost:${PORTFRONT}`;

// Reference all data tables from schema
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
      "http://localhost:5173",        // Vite dev server
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
// API: Register
// ==========================================
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password, avatar } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "username, email and password are required",
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
      return res.status(409).json({ error: "Email or username is already taken" });
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

    // Always log verify URL to console (works even without email config)
    const verifyUrl = `${process.env.BACKEND_URL || `http://localhost:${process.env.BACKEND_PORT || 3001}`}/api/auth/verify?token=${token}`;
    console.log(`\n========================================`);
    console.log(`[REGISTER] User: ${email}`);
    console.log(`[REGISTER] Verify URL: ${verifyUrl}`);
    console.log(`[REGISTER] Or use API: GET /api/dev/verify-email?email=${email}`);
    console.log(`========================================\n`);

    // Send real email (skipped gracefully if not configured)
    try {
      await sendVerificationEmail(email, token);
    } catch (mailErr) {
      console.warn("[REGISTER] Email could not be sent (see console for verify URL):", (mailErr as Error).message);
    }

    res.status(201).json({
      message: "Registration successful! Check server console for the verification link.",
      data: formatUser(newUser),
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// ==========================================
// API: Verify Email
// ==========================================
app.get("/api/auth/verify", async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.redirect(`${frontendUrl}/verify?status=invalid`);
    }

    const [user] = await dbClient
      .select()
      .from(users)
      .where(eq(users.verificationToken, token))
      .limit(1);

    if (!user) {
      // Token not found or expired
      return res.redirect(`${frontendUrl}/verify?status=invalid`);
    }

    if (user.emailVerified) {
      // Already verified
      return res.redirect(`${frontendUrl}/verify?status=already`);
    }

    if (
      user.verificationExpire &&
      user.verificationExpire < new Date()
    ) {
      return res.redirect(`${frontendUrl}/verify?status=expired`);
    }

    await dbClient
      .update(users)
      .set({
        emailVerified: true,
        verificationToken: null,
        verificationExpire: null,
      })
      .where(eq(users.id, user.id));

    return res.redirect(`${process.env.FRONTEND_URL}/verify?status=success`);
  } catch (error) {
    console.error("Verify error:", error);
    return res.redirect(`${frontendUrl}/verify?status=error`);
  }
});

// ==========================================
// DEV ONLY: Bypass email verification without psql
// Example: GET /api/dev/verify-email?email=test@test.com
// ==========================================
app.get("/api/dev/verify-email", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Not allowed in production" });
  }

  const { email } = req.query;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Please provide ?email=..." });
  }

  const [user] = await dbClient
    .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return res.status(404).json({ error: `User not found: ${email}` });
  }

  if (user.emailVerified) {
    return res.status(200).json({ message: `${email} is already verified` });
  }

  await dbClient
    .update(users)
    .set({ emailVerified: true, verificationToken: null, verificationExpire: null })
    .where(eq(users.email, email));

  return res.status(200).json({ message: `✅ Email verified: ${email} — you can now log in` });
});

// ==========================================
// API: Login (accepts id / username / email + password)
// Supports rememberMe: true → JWT expires in 30d, false → 1d
// ==========================================
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { id, username, email, password, rememberMe } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (!id && !username && !email) {
      return res.status(400).json({
        error: "Must provide at least one of: id, username, or email",
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
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in",
      });
    }

    // Issue JWT token — rememberMe = true → 30 days, false → 1 day
    const token = signToken(
      { userId: user.id, email: user.email, username: user.username },
      Boolean(rememberMe)
    );

    res.status(200).json({
      message: "Login successful",
      token,
      expiresIn: rememberMe ? "30d" : "1d",
      data: formatUser(user),
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Failed to log in" });
  }
});

// ==========================================
// API: Get current user from JWT (Protected Route)
// ==========================================
app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const [user] = await dbClient
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "User fetched successfully",
      data: formatUser(user),
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ==========================================
// API: Forgot Password — ส่ง reset link ทางอีเมล
// ==========================================
app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "กรุณาระบุอีเมล" });
    }

    const [user] = await dbClient
      .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // ตอบกลับเหมือนกันเสมอ เพื่อป้องกัน user enumeration
    if (!user || !user.emailVerified) {
      return res.status(200).json({
        message: "หากอีเมลนี้มีในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่าน",
      });
    }

    // สร้าง token แบบ UUID
    const resetToken = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 นาที

    // เก็บ token ไว้ใน memory (key = token)
    resetTokenStore.set(resetToken, { email, expiresAt });

    // ส่งอีเมลพร้อม reset link
    await sendResetPasswordEmail(email, resetToken);

    res.status(200).json({
      message: "หากอีเมลนี้มีในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่าน",
    });
  } catch (error) {
    console.error("Error in forgot-password:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
  }
});

// ==========================================
// API: Reset Password — ผู้ใช้คลิก link จากอีเมล (GET) redirect ไปหน้า frontend
// ==========================================
app.get("/api/auth/reset-password", async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.redirect(`${frontendUrl}/reset-password?status=invalid`);
  }

  const stored = resetTokenStore.get(token);

  if (!stored) {
    return res.redirect(`${frontendUrl}/reset-password?status=invalid`);
  }

  if (stored.expiresAt < new Date()) {
    resetTokenStore.delete(token);
    return res.redirect(`${frontendUrl}/reset-password?status=expired`);
  }

  // ส่ง token ไปให้ frontend เพื่อกรอกรหัสผ่านใหม่
  return res.redirect(`${frontendUrl}/reset-password?token=${token}`);
});

// ==========================================
// API: Reset Password — บันทึกรหัสผ่านใหม่ (POST)
// ==========================================
app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "token และ newPassword จำเป็นต้องระบุ" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
    }

    const stored = resetTokenStore.get(token);

    if (!stored) {
      return res.status(400).json({ error: "ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่" });
    }

    if (stored.expiresAt < new Date()) {
      resetTokenStore.delete(token);
      return res.status(400).json({ error: "ลิงก์หมดอายุแล้ว กรุณาขอลิงก์ใหม่" });
    }

    const hashedPassword = await hashPassword(newPassword);

    await dbClient
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, stored.email));

    // ลบ token หลังใช้งานสำเร็จ
    resetTokenStore.delete(token);

    res.status(200).json({ message: "เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่" });
  } catch (error) {
    console.error("Error in reset-password:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
  }
});

// ==========================================
// API: Get user by ID
// ==========================================
app.get("/api/auth/user/:id", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.id);

    const [user] = await dbClient
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.emailVerified) {
      return res.send("This email has already been verified");
    }

    res.status(200).json({
      message: "User fetched successfully",
      data: formatUser(user),
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ==========================================
// API: List available data tables
// ==========================================
app.get("/api/data/tables", (_req: Request, res: Response) => {
  const tables = Object.entries(dataTables).map(([name, table]) => ({
    name,
    columns: Object.keys(table),
  }));

  res.status(200).json({
    message: "Data tables retrieved",
    data: tables,
  });
});

// ==========================================
// API: Save focus session (called on Stop)
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
        startTime: newSession[0].startTime.toLocaleString("en-US", {
          timeZone: "Asia/Bangkok",
        }),
        endTime: newSession[0].endTime.toLocaleString("en-US", {
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
// API: Get all focus session history
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
// Start Server
// ==========================================
const PORT = process.env.BACKEND_PORT || 3001;

startCleanupJob();

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
