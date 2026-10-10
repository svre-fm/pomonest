import { Router } from "express";
import type { Request, Response } from "express";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import {
  users,
  tasks,
  categories,
  activities,
  focusSessions,
  userEggs,
  userAnimals,
} from "@db/schema.js";
import { isValidUUID, formatUser } from "../../utils/validators.js";

const adminUsersRouter = Router();

// ==========================================
// GET /api/admin/users - ดึงรายชื่อผู้ใช้ทั้งหมด
// รองรับ ?search= (username/email), ?role=, ?page=, ?limit=
// ==========================================
adminUsersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { search, role, page = "1", limit = "20" } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];

    if (search && typeof search === "string" && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(users.username, term), ilike(users.email, term)));
    }

    if (role && (role === "user" || role === "admin")) {
      conditions.push(eq(users.role, role));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await dbClient
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const total = totalResult ? Number(totalResult.count) : 0;

    const allUsers = await dbClient
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        avatar: users.avatar,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.status(200).json({
      message: "Users fetched successfully",
      data: allUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching users for admin:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ==========================================
// GET /api/admin/users/:id - ดึงรายละเอียดผู้ใช้คนเดียว พร้อมสถิติ
// ==========================================
adminUsersRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.id);

    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const [user] = await dbClient
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        avatar: users.avatar,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ดึงสถิติต่างๆ ของผู้ใช้
    const [[sessionCount], [animalCount], [eggCount]] = await Promise.all([
      dbClient.select({ count: count() }).from(focusSessions).where(eq(focusSessions.userId, userId)),
      dbClient.select({ count: count() }).from(userAnimals).where(eq(userAnimals.userId, userId)),
      dbClient.select({ count: count() }).from(userEggs).where(eq(userEggs.userId, userId)),
    ]);

    res.status(200).json({
      message: "User fetched successfully",
      data: {
        ...user,
        stats: {
          totalSessions: Number(sessionCount?.count ?? 0),
          totalAnimals: Number(animalCount?.count ?? 0),
          totalEggs: Number(eggCount?.count ?? 0),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching single user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ==========================================
// PUT /api/admin/users/:id - แก้ไขข้อมูลผู้ใช้
// ==========================================
adminUsersRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.id);

    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const [existing] = await dbClient
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    const { username, email, avatar, role, emailVerified } = req.body;

    const updates: Partial<typeof users.$inferInsert> = {};

    if (username !== undefined) {
      const trimmedUsername = String(username).trim();
      if (!trimmedUsername) {
        return res.status(400).json({ error: "Username cannot be empty" });
      }

      // ตรวจสอบ username ซ้ำกับคนอื่น
      const [duplicateUsername] = await dbClient
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, trimmedUsername), sql`${users.id} != ${userId}`))
        .limit(1);

      if (duplicateUsername) {
        return res.status(409).json({ error: "Username is already in use by another account" });
      }

      updates.username = trimmedUsername;
    }

    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      if (!trimmedEmail) {
        return res.status(400).json({ error: "Email cannot be empty" });
      }

      // ตรวจสอบ email ซ้ำกับคนอื่น
      const [duplicateEmail] = await dbClient
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, trimmedEmail), sql`${users.id} != ${userId}`))
        .limit(1);

      if (duplicateEmail) {
        return res.status(409).json({ error: "Email is already in use by another account" });
      }

      updates.email = trimmedEmail;
    }

    if (avatar !== undefined) {
      updates.avatar = avatar ? String(avatar).trim() : null;
    }

    if (role !== undefined) {
      if (role !== "user" && role !== "admin") {
        return res.status(400).json({ error: "Invalid role value. Must be 'user' or 'admin'" });
      }
      updates.role = role;
    }

    if (emailVerified !== undefined) {
      updates.emailVerified = Boolean(emailVerified);
      if (emailVerified) {
        updates.verificationToken = null;
        updates.verificationExpire = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const [updatedUser] = await dbClient
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    res.status(200).json({
      message: "User updated successfully",
      data: formatUser(updatedUser),
    });
  } catch (error) {
    console.error("Error updating user by admin:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ==========================================
// PATCH /api/admin/users/:id/role - เปลี่ยน Role ผู้ใช้
// ==========================================
adminUsersRouter.patch("/:id/role", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.id);

    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const { role } = req.body;

    if (!role || (role !== "user" && role !== "admin")) {
      return res.status(400).json({ error: "Role must be 'user' or 'admin'" });
    }

    const [existing] = await dbClient
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    const [updatedUser] = await dbClient
      .update(users)
      .set({ role })
      .where(eq(users.id, userId))
      .returning();

    res.status(200).json({
      message: `User role updated to ${role} successfully`,
      data: formatUser(updatedUser),
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// ==========================================
// DELETE /api/admin/users/:id - ลบผู้ใช้และข้อมูลทั้งหมดที่เกี่ยวข้อง
// ==========================================
adminUsersRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.id);

    if (!isValidUUID(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // ป้องกันไม่ให้แอดมินลบบัญชีตัวเองโดยไม่ได้ตั้งใจ
    if (req.user?.userId === userId) {
      return res.status(400).json({ error: "Cannot delete your own admin account" });
    }

    const [existing] = await dbClient
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "User not found" });
    }

    // ลบข้อมูลที่ผูก foreign key ทั้งหมดของผู้ใช้รายนี้ก่อน
    await dbClient.delete(focusSessions).where(eq(focusSessions.userId, userId));
    await dbClient.delete(userAnimals).where(eq(userAnimals.userId, userId));
    await dbClient.delete(userEggs).where(eq(userEggs.userId, userId));
    await dbClient.delete(tasks).where(eq(tasks.userId, userId));
    await dbClient.delete(categories).where(eq(categories.userId, userId));
    await dbClient.delete(activities).where(eq(activities.userId, userId));

    // ลบผู้ใช้
    await dbClient.delete(users).where(eq(users.id, userId));

    res.status(200).json({
      message: "User and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user by admin:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default adminUsersRouter;
