import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import { and, desc, eq, or, sql, type SQL } from "drizzle-orm";
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

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

const app = express();

app.use(
  cors({
    origin: [
      `http://localhost:${PORTFRONT}`,
      "http://localhost:5173",        // Vite dev server
      "http://fsg12.cpecmu.com",
      "https://fsg12.cpecmu.com",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
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
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const [user] = await dbClient
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Return the same response to prevent user enumeration
    if (!user || !user.emailVerified) {
      return res.status(200).json({
        message: "If this email exists in our system, you will receive a password reset link.",
      });
    }

    // Generate a UUID reset token
    const resetToken = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store the token in memory
    resetTokenStore.set(resetToken, { email, expiresAt });

    // Send reset link via email
    await sendResetPasswordEmail(email, resetToken);

    res.status(200).json({
      message: "If this email exists in our system, you will receive a password reset link.",
    });
  } catch (error) {
    console.error("Error in forgot-password:", error);

    res.status(500).json({
      error: "Something went wrong. Please try again later.",
    });
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
      return res.status(400).json({
        error: "Token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    const stored = resetTokenStore.get(token);

    if (!stored) {
      return res.status(400).json({
        error: "Invalid or expired reset link. Please request a new one",
      });
    }

    if (stored.expiresAt < new Date()) {
      resetTokenStore.delete(token);

      return res.status(400).json({
        error: "Reset link has expired. Please request a new one",
      });
    }

    const hashedPassword = await hashPassword(newPassword);

    await dbClient
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.email, stored.email));

    // Delete token after successful password reset
    resetTokenStore.delete(token);

    res.status(200).json({
      message: "Password changed successfully. Please log in again",
    });
  } catch (error) {
    console.error("Error in reset-password:", error);

    res.status(500).json({
      error: "Something went wrong. Please try again later",
    });
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
app.post("/api/timer/save", requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      taskId,
      activityId,
      userEggId,
      startTime,
      endTime,
      duration,
      status,
    } = req.body;

    const userId = req.user!.userId;

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
// API: Categories (CRUD)
// ==========================================

// GET /api/categories - ดึง categories ของ user ที่ login
app.get("/api/categories", requireAuth, async (req: Request, res: Response) => {
  try {
    const userCategories = await dbClient
      .select()
      .from(categories)
      .where(eq(categories.userId, req.user!.userId));

    res.status(200).json({
      message: "Categories fetched successfully",
      data: userCategories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// POST /api/categories - สร้าง category ใหม่
app.post("/api/categories", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const trimmedName = name.trim();
    const finalColor = color ? String(color).trim() : "#7fa65a";

    //check category duplicate
    const [existingCategory] = await dbClient
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, req.user!.userId),
          sql`lower(${categories.name}) = lower(${trimmedName})`,
          sql`lower(${categories.color}) = lower(${finalColor})`
        )
      )
      .limit(1);
    
    if (existingCategory) {
      return res.status(409).json({ error: "Category with this name or color already exists" });
    }

    const [newCategory] = await dbClient
      .insert(categories)
      .values({
        userId: req.user!.userId,
        name: name.trim(),
        color: color ? String(color).trim() : "#7fa65a",
      })
      .returning();

    res.status(201).json({
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// PUT /api/categories/:id - แก้ไข category
app.put("/api/categories/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const categoryId = String(req.params.id);
    const { name, color } = req.body;

    const [existing] = await dbClient
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, req.user!.userId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Category not found" });
    }

    const updates: Partial<typeof categories.$inferInsert> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (color !== undefined) updates.color = String(color).trim();

    const [updated] = await dbClient
      .update(categories)
      .set(updates)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, req.user!.userId)))
      .returning();

    res.status(200).json({
      message: "Category updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// DELETE /api/categories/:id - ลบ category
app.delete("/api/categories/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const categoryId = String(req.params.id);

    const [existing] = await dbClient
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, req.user!.userId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Category not found" });
    }

    // ถอด categoryId ออกจาก tasks ของหมวดนี้ก่อนลบ เพื่อไม่ให้ติด foreign key constraint
    await dbClient
      .update(tasks)
      .set({ categoryId: null })
      .where(eq(tasks.categoryId, categoryId));

    await dbClient
      .delete(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, req.user!.userId)));

    res.status(200).json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ==========================================
// API: Tasks (CRUD)
// ==========================================

// GET /api/tasks - ดึง tasks ทั้งหมดของ user
app.get("/api/tasks", requireAuth, async (req: Request, res: Response) => {
  try {
    const userTasks = await dbClient
      .select({
        id: tasks.id,
        userId: tasks.userId,
        categoryId: tasks.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        title: tasks.title,
        status: tasks.status,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .leftJoin(categories, eq(tasks.categoryId, categories.id))
      .where(eq(tasks.userId, req.user!.userId))
      .orderBy(desc(tasks.id));

    res.status(200).json({
      message: "Tasks fetched successfully",
      data: userTasks,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// GET /api/tasks/:id - ดึง task เดี่ยว (เฉพาะตัวมันเอง)
app.get("/api/tasks/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const taskId = String(req.params.id);

    if (!isValidUUID(taskId)) {
      return res.status(400).json({ error: "Invalid task ID format" });
    }

    const [task] = await dbClient
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, req.user!.userId)))
      .limit(1);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.status(200).json({
      message: "Task fetched successfully",
      data: task,
    });
  } catch (error) {
    console.error("Error fetching single task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// POST /api/tasks - สร้าง task ใหม่
app.post("/api/tasks", requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, text, categoryId, dueDate, status } = req.body;
    const taskTitle = title !== undefined ? title : text;

    if (!taskTitle || typeof taskTitle !== "string" || !taskTitle.trim()) {
      return res.status(400).json({ error: "Task title is required" });
    }

    let parsedCategoryId: string | null = null;
    if (categoryId && categoryId !== "none") {
      if (!isValidUUID(categoryId)) {
        return res.status(400).json({ error: "Invalid category ID format" });
      }
      parsedCategoryId = categoryId;
    }

    const taskStatus = status && ["todo", "doing", "done"].includes(status) ? status : "todo";

    const [newTask] = await dbClient
      .insert(tasks)
      .values({
        userId: req.user!.userId,
        categoryId: parsedCategoryId,
        title: taskTitle.trim(),
        status: taskStatus,
        dueDate: dueDate ? new Date(dueDate) : null,
        completedAt: taskStatus === "done" ? new Date() : null,
      })
      .returning();

    res.status(201).json({
      message: "Task created successfully",
      data: newTask,
    });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// PUT /api/tasks/:id - แก้ไข task
app.put("/api/tasks/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const taskId = String(req.params.id);

    if (!isValidUUID(taskId)) {
      return res.status(400).json({ error: "Invalid task ID format" });
    }

    const { title, text, categoryId, dueDate, status, completedAt, completed } = req.body;

    const [existing] = await dbClient
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, req.user!.userId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updates: Partial<typeof tasks.$inferInsert> = {};

    // Support both title and text (fallback)
    const newTitle = title !== undefined ? title : text;
    if (newTitle !== undefined) {
      if (typeof newTitle !== "string" || !newTitle.trim()) {
        return res.status(400).json({ error: "Task title cannot be empty" });
      }
      updates.title = newTitle.trim();
    }

    if (categoryId !== undefined) {
      if (!categoryId || categoryId === "none") {
        updates.categoryId = null;
      } else {
        if (!isValidUUID(categoryId)) {
          return res.status(400).json({ error: "Invalid category ID format" });
        }
        updates.categoryId = categoryId;
      }
    }

    if (dueDate !== undefined) {
      updates.dueDate = dueDate ? new Date(dueDate) : null;
    }

    // Support both status ('todo' | 'doing' | 'done') and completed (boolean)
    let resolvedStatus = status;
    if (!resolvedStatus && completed !== undefined) {
      resolvedStatus = completed ? "done" : "todo";
    }

    if (resolvedStatus !== undefined && ["todo", "doing", "done"].includes(resolvedStatus)) {
      updates.status = resolvedStatus;
      if (resolvedStatus === "done" && !existing.completedAt) {
        updates.completedAt = completedAt ? new Date(completedAt) : new Date();
      } else if (resolvedStatus !== "done") {
        updates.completedAt = null;
      }
    } else if (completedAt !== undefined) {
      updates.completedAt = completedAt ? new Date(completedAt) : null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const [updated] = await dbClient
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, req.user!.userId)))
      .returning();

    res.status(200).json({
      message: "Task updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// PATCH /api/tasks/:id/status - อัปเดตสถานะ task (เช่น ติ๊กถูก done หรือ todo)
app.patch("/api/tasks/:id/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const taskId = String(req.params.id);

    if (!isValidUUID(taskId)) {
      return res.status(400).json({ error: "Invalid task ID format" });
    }

    const { status, completed } = req.body;

    let targetStatus = status;
    if (!targetStatus && completed !== undefined) {
      targetStatus = completed ? "done" : "todo";
    }

    if (!targetStatus || !["todo", "doing", "done"].includes(targetStatus)) {
      return res.status(400).json({ error: "Valid status ('todo', 'doing', 'done') is required" });
    }

    const [existing] = await dbClient
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, req.user!.userId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Task not found" });
    }

    const [updated] = await dbClient
      .update(tasks)
      .set({
        status: targetStatus,
        completedAt: targetStatus === "done" ? new Date() : null,
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, req.user!.userId)))
      .returning();

    res.status(200).json({
      message: "Task status updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ error: "Failed to update task status" });
  }
});

// DELETE /api/tasks/:id - ลบ task
app.delete("/api/tasks/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const taskId = String(req.params.id);

    if (!isValidUUID(taskId)) {
      return res.status(400).json({ error: "Invalid task ID format" });
    }

    const [existing] = await dbClient
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, req.user!.userId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Task not found" });
    }

    await dbClient
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, req.user!.userId)));

    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// ==========================================
// API: Activities
// ==========================================

// GET /api/activities - ดึง activities ทั้งหมดของ user
app.get("/api/activities", requireAuth, async (req: Request, res: Response) => {
  try {
    const userActivities = await dbClient
      .select()
      .from(activities)
      .where(eq(activities.userId, req.user!.userId))
      .orderBy(desc(activities.id));

    res.status(200).json({
      message: "Activities fetched successfully",
      data: userActivities,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// GET /api/activities/:id - ดึง activity เดี่ยว (เฉพาะตัวมันเอง)
app.get("/api/activities/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const activityId = String(req.params.id);

    if (!isValidUUID(activityId)) {
      return res.status(400).json({ error: "Invalid activity ID format" });
    }

    const [activity] = await dbClient
      .select()
      .from(activities)
      .where(and(eq(activities.id, activityId), eq(activities.userId, req.user!.userId)))
      .limit(1);

    if (!activity) {
      return res.status(404).json({ error: "Activity not found" });
    }

    res.status(200).json({
      message: "Activity fetched successfully",
      data: activity,
    });
  } catch (error) {
    console.error("Error fetching single activity:", error);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// POST /api/activities - สร้าง activity ใหม่
app.post("/api/activities", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Activity name is required" });
    }

    const [newActivity] = await dbClient
      .insert(activities)
      .values({
        userId: req.user!.userId,
        name: name.trim(),
        color: color ? String(color).trim() : "#7fa65a",
      })
      .returning();

    res.status(201).json({
      message: "Activity created successfully",
      data: newActivity,
    });
  } catch (error) {
    console.error("Error creating activity:", error);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

// PUT /api/activities/:id - แก้ไข activity
app.put("/api/activities/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const activityId = String(req.params.id);

    if (!isValidUUID(activityId)) {
      return res.status(400).json({ error: "Invalid activity ID format" });
    }

    const { name, color } = req.body;

    const [existing] = await dbClient
      .select()
      .from(activities)
      .where(and(eq(activities.id, activityId), eq(activities.userId, req.user!.userId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Activity not found" });
    }

    const updates: Partial<typeof activities.$inferInsert> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Activity name cannot be empty" });
      }
      updates.name = name.trim();
    }
    if (color !== undefined) updates.color = String(color).trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const [updated] = await dbClient
      .update(activities)
      .set(updates)
      .where(and(eq(activities.id, activityId), eq(activities.userId, req.user!.userId)))
      .returning();

    res.status(200).json({
      message: "Activity updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating activity:", error);
    res.status(500).json({ error: "Failed to update activity" });
  }
});

// DELETE /api/activities/:id - ลบ activity
app.delete("/api/activities/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const activityId = String(req.params.id);

    if (!isValidUUID(activityId)) {
      return res.status(400).json({ error: "Invalid activity ID format" });
    }

    const [existing] = await dbClient
      .select()
      .from(activities)
      .where(and(eq(activities.id, activityId), eq(activities.userId, req.user!.userId)))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Activity not found" });
    }

    await dbClient
      .delete(activities)
      .where(and(eq(activities.id, activityId), eq(activities.userId, req.user!.userId)));

    res.status(200).json({
      message: "Activity deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting activity:", error);
    res.status(500).json({ error: "Failed to delete activity" });
  }
});

// ==========================================
// API: User Animals (Collection)
// ==========================================

// GET /api/user-animals - ดึงสัตว์ที่ user ครอบครอง
app.get("/api/user-animals", requireAuth, async (req: Request, res: Response) => {
  try {
    const userOwnedAnimals = await dbClient
      .select({
        id: userAnimals.id,
        userId: userAnimals.userId,
        animalId: userAnimals.animalId,
        nickname: userAnimals.nickname,
        obtainedAt: userAnimals.obtainedAt,
        animalName: animals.name,
        animalRarity: animals.rarity,
        animalImage: animals.image,
        animalAnimation: animals.animation,
      })
      .from(userAnimals)
      .innerJoin(animals, eq(userAnimals.animalId, animals.id))
      .where(eq(userAnimals.userId, req.user!.userId))
      .orderBy(desc(userAnimals.obtainedAt));

    res.status(200).json({
      message: "User animals fetched successfully",
      data: userOwnedAnimals,
    });
  } catch (error) {
    console.error("Error fetching user animals:", error);
    res.status(500).json({ error: "Failed to fetch user animals" });
  }
});

// ==========================================
// API: Master Data (Eggs, Egg Rewards, Animals, User Eggs)
// ==========================================

// GET /api/eggs - ดึงข้อมูลไข่ทั้งหมด
app.get("/api/eggs", async (_req: Request, res: Response) => {
  try {
    const allEggs = await dbClient.select().from(eggs);
    res.status(200).json({
      message: "Eggs fetched successfully",
      data: allEggs,
    });
  } catch (error) {
    console.error("Error fetching eggs:", error);
    res.status(500).json({ error: "Failed to fetch eggs" });
  }
});

// GET /api/animals - ดึงข้อมูลสัตว์ทั้งหมด
app.get("/api/animals", async (_req: Request, res: Response) => {
  try {
    const allAnimals = await dbClient.select().from(animals);
    res.status(200).json({
      message: "Animals fetched successfully",
      data: allAnimals,
    });
  } catch (error) {
    console.error("Error fetching animals:", error);
    res.status(500).json({ error: "Failed to fetch animals" });
  }
});

// GET /api/egg-rewards - ดึงข้อมูลรางวัลไข่ (เชื่อมไข่กับสัตว์และอัตราดรอป)
app.get("/api/egg-rewards", async (req: Request, res: Response) => {
  try {
    const { eggId } = req.query;

    let query = dbClient
      .select({
        id: eggRewards.id,
        eggId: eggRewards.eggId,
        eggName: eggs.name,
        animalId: eggRewards.animalId,
        animalName: animals.name,
        animalRarity: animals.rarity,
        animalImage: animals.image,
        animalAnimation: animals.animation,
        dropRate: eggRewards.dropRate,
      })
      .from(eggRewards)
      .innerJoin(eggs, eq(eggRewards.eggId, eggs.id))
      .innerJoin(animals, eq(eggRewards.animalId, animals.id));

    if (eggId && typeof eggId === "number") {
      const rewards = await query.where(eq(eggRewards.eggId, eggId));
      return res.status(200).json({
        message: "Egg rewards fetched successfully",
        data: rewards,
      });
    }

    const rewards = await query;
    res.status(200).json({
      message: "Egg rewards fetched successfully",
      data: rewards,
    });
  } catch (error) {
    console.error("Error fetching egg rewards:", error);
    res.status(500).json({ error: "Failed to fetch egg rewards" });
  }
});

// GET /api/user-eggs - ดึงไข่ของ user ที่ login (ประวัติและที่กำลังฟัก)
app.get("/api/user-eggs", requireAuth, async (req: Request, res: Response) => {
  try {
    const myEggs = await dbClient
      .select({
        id: userEggs.id,
        userId: userEggs.userId,
        eggId: userEggs.eggId,
        eggName: eggs.name,
        eggRequired: eggs.required,
        eggImage: eggs.image,
        progress: userEggs.progress,
        status: userEggs.status,
        startTime: userEggs.startTime,
        hatchedAt: userEggs.hatchedAt,
      })
      .from(userEggs)
      .innerJoin(eggs, eq(userEggs.eggId, eggs.id))
      .where(eq(userEggs.userId, req.user!.userId))
      .orderBy(desc(userEggs.startTime));

    res.status(200).json({
      message: "User eggs fetched successfully",
      data: myEggs,
    });
  } catch (error) {
    console.error("Error fetching user eggs:", error);
    res.status(500).json({ error: "Failed to fetch user eggs" });
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
