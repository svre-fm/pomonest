import { Router } from "express";
import type { Request, Response } from "express";
import { eq, or, type SQL } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { users } from "@db/schema.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { randomUUID } from "node:crypto";
import { sendVerificationEmail, sendResetPasswordEmail } from "../service/mail.service.js";
import { signToken } from "../auth/jwt.js";
import { requireAuth } from "../auth/middleware.js";
import { formatUser } from "../utils/validators.js";

// In-memory store for reset password tokens (token -> { email, expiresAt })
// In production, move this to Redis or a DB table
const resetTokenStore = new Map<string, { email: string; expiresAt: Date }>();

const PORTFRONT = process.env.FRONTEND_PORT || 6012;

const frontendUrl =
  process.env.FRONTEND_URL || `http://localhost:${PORTFRONT}`;

const authRouter = Router();

// ==========================================
// API: Register
// ==========================================
authRouter.post("/register", async (req: Request, res: Response) => {
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
authRouter.get("/verify", async (req: Request, res: Response) => {
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
// API: Login (accepts id / username / email + password)
// Supports rememberMe: true → JWT expires in 30d, false → 1d
// ==========================================
authRouter.post("/login", async (req: Request, res: Response) => {
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
      { userId: user.id, email: user.email, username: user.username, role: user.role },
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
authRouter.get("/me", requireAuth, async (req: Request, res: Response) => {
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
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
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
authRouter.get("/reset-password", async (req: Request, res: Response) => {
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
authRouter.post("/reset-password", async (req: Request, res: Response) => {
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
authRouter.get("/user/:id", async (req: Request, res: Response) => {
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
// DEV ONLY: Bypass email verification without psql
// Example: GET /api/dev/verify-email?email=test@test.com
// ==========================================
export const devAuthRouter = Router();

devAuthRouter.get("/verify-email", async (req: Request, res: Response) => {
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

export default authRouter;
