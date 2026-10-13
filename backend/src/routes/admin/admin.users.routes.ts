import { Router } from "express";
import type { Request, Response } from "express";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
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
import { runAsAdmin, logAdminAction } from "../../utils/adminHelpers.js";

const adminUsersRouter = Router();

// สถิติรายผู้ใช้
const focusSecondsExpr = sql<number>`(select coalesce(sum(fs.duration), 0)::int from focus_sessions fs where fs.user_id = users.id and fs.status = 'completed')`;
const eggsHatchedExpr = sql<number>`(select count(*)::int from user_eggs ue where ue.user_id = users.id and ue.status = 'hatched')`;
const animalCountExpr = sql<number>`(select count(*)::int from user_animals ua where ua.user_id = users.id)`;

const USER_SORTS = ["recent", "oldest", "focus", "eggs", "animals"] as const;

// ==========================================
// GET /api/admin/users - ดึงรายชื่อผู้ใช้ทั้งหมด
// รองรับ ?search= (username/email), ?role=, ?page=, ?limit=
// ==========================================
adminUsersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { search, role, status, sort, page = "1", limit = "20" } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    if (sort !== undefined && !(USER_SORTS as readonly string[]).includes(String(sort))) {
      return res.status(400).json({ error: `sort must be one of: ${USER_SORTS.join(", ")}` });
    }

    const conditions = [];

    if (search && typeof search === "string" && search.trim()) {
      // escape ตัวอักษรพิเศษของ LIKE เพื่อให้ค้นหาตามตัวอักษรจริง (เช่น พิมพ์ % จะไม่กลายเป็นตรงกับทุกคน)
      const term = `%${search.trim().replace(/[\\%_]/g, "\\$&")}%`;
      conditions.push(or(ilike(users.username, term), ilike(users.email, term)));
    }

    if (role && (role === "user" || role === "admin")) {
      conditions.push(eq(users.role, role));
    }

    if (status === "active") conditions.push(eq(users.isActive, true));
    if (status === "disabled") conditions.push(eq(users.isActive, false));
    if (status === "verified") conditions.push(eq(users.emailVerified, true));
    if (status === "unverified") conditions.push(eq(users.emailVerified, false));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await dbClient
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    const total = totalResult ? Number(totalResult.count) : 0;

    const sortKey = typeof sort === "string" ? sort : "recent";
    const orderBy =
      sortKey === "oldest"
        ? [asc(users.createdAt)]
        : sortKey === "focus"
          ? [desc(focusSecondsExpr), desc(users.createdAt)]
          : sortKey === "eggs"
            ? [desc(eggsHatchedExpr), desc(users.createdAt)]
            : sortKey === "animals"
              ? [desc(animalCountExpr), desc(users.createdAt)]
              : [desc(users.createdAt)];

    const allUsers = await dbClient
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        avatar: users.avatar,
        role: users.role,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        focusSeconds: focusSecondsExpr,
        eggsHatched: eggsHatchedExpr,
        animalCount: animalCountExpr,
      })
      .from(users)
      .where(whereClause)
      .orderBy(...orderBy, asc(users.id))
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
        profile: users.avatar,
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
    const [[sessionStats], [animalCount], [eggStats]] = await Promise.all([
      dbClient
        .select({
          total: count(),
          completed: sql<number>`(count(*) filter (where ${focusSessions.status} = 'completed'))::int`,
          focusSeconds: sql<number>`(coalesce(sum(${focusSessions.duration}) filter (where ${focusSessions.status} = 'completed'), 0))::int`,
        })
        .from(focusSessions)
        .where(eq(focusSessions.userId, userId)),
      dbClient.select({ count: count() }).from(userAnimals).where(eq(userAnimals.userId, userId)),
      dbClient
        .select({
          total: count(),
          hatched: sql<number>`(count(*) filter (where ${userEggs.status} = 'hatched'))::int`,
        })
        .from(userEggs)
        .where(eq(userEggs.userId, userId)),
    ]);

    res.status(200).json({
      message: "User fetched successfully",
      data: {
        ...user,
        stats: {
          totalSessions: Number(sessionStats?.total ?? 0),
          completedSessions: sessionStats?.completed ?? 0,
          cancelledSessions: Number(sessionStats?.total ?? 0) - (sessionStats?.completed ?? 0),
          focusSeconds: sessionStats?.focusSeconds ?? 0, 
          totalAnimals: Number(animalCount?.count ?? 0),
          totalEggs: Number(eggStats?.total ?? 0),
          hatchedEggs: eggStats?.hatched ?? 0,
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

    // เปลี่ยน role ต้องผ่าน PATCH /:id/role เท่านั้น (มีการป้องกันตัวเอง + บันทึก log)
    if (role !== undefined) {
      return res.status(400).json({ error: "Use PATCH /api/admin/users/:id/role to change a role" });
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

    const adminId = req.user!.userId;
    const result = await runAsAdmin(adminId, async (tx, adminName) => {
      const [updatedUser] = await tx
        .update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();

      await logAdminAction(tx, {
        adminId,
        adminName,
        action: "edit_user",
        targetType: "user",
        targetId: userId,
        details: `${existing.email}: ${Object.keys(updates)
          .filter((key) => !key.startsWith("verification"))
          .join(", ")}`,
      });

      return { ok: true as const, value: updatedUser };
    });

    if (!result.ok) return res.status(result.status).json({ error: result.error });

    res.status(200).json({
      message: "User updated successfully",
      data: formatUser(result.value),
    });
  } catch (error) {
    console.error("Error updating user by admin:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ==========================================
// PATCH /api/admin/users/:id/role - เปลี่ยน Role ผู้ใช้
// body: { role: "user" | "admin" }
// ==========================================
adminUsersRouter.patch("/:id/role", async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const adminId = req.user!.userId;
  const { role } = req.body ?? {};

  if (!isValidUUID(userId)) {
    return res.status(400).json({ error: "Invalid user ID format" });
  }
  if (role !== "user" && role !== "admin") {
    return res.status(400).json({ error: "Role must be 'user' or 'admin'" });
  }
  // กัน admin ลดสิทธิ์ตัวเองจนระบบไม่เหลือ admin
  if (userId === adminId) {
    return res.status(400).json({ error: "You cannot change your own role" });
  }

  try {
    const result = await runAsAdmin(adminId, async (tx, adminName) => {
      const [target] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .for("update");

      if (!target) return { ok: false as const, status: 404, error: "User not found" };
      if (target.role === role) return { ok: true as const, value: target }; // ไม่มีอะไรเปลี่ยน

      const [updated] = await tx
        .update(users)
        .set({ role })
        .where(eq(users.id, userId))
        .returning();

      await logAdminAction(tx, {
        adminId,
        adminName,
        action: "change_role",
        targetType: "user",
        targetId: userId,
        details: `${target.email}: ${target.role} -> ${role}`,
      });

      return { ok: true as const, value: updated };
    });

    if (!result.ok) return res.status(result.status).json({ error: result.error });

    res.status(200).json({
      message: `User role updated to ${role} successfully`,
      data: formatUser(result.value),
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// ==========================================
// PATCH /api/admin/users/:id/active - ระงับ / เปิดใช้งานบัญชี
// ==========================================
adminUsersRouter.patch("/:id/active", async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const adminId = req.user!.userId;
  const { isActive } = req.body ?? {};

  if (!isValidUUID(userId)) {
    return res.status(400).json({ error: "Invalid user ID format" });
  }
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ error: "isActive must be a boolean" });
  }
  if (userId === adminId) {
    return res.status(400).json({ error: "You cannot disable your own account" });
  }

  try {
    const result = await runAsAdmin(adminId, async (tx, adminName) => {
      const [target] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .for("update");

      if (!target) return { ok: false as const, status: 404, error: "User not found" };
      if (target.isActive === isActive) return { ok: true as const, value: target };

      const [updated] = await tx
        .update(users)
        .set({ isActive })
        .where(eq(users.id, userId))
        .returning();

      await logAdminAction(tx, {
        adminId,
        adminName,
        action: isActive ? "enable_user" : "disable_user",
        targetType: "user",
        targetId: userId,
        details: target.email,
      });

      return { ok: true as const, value: updated };
    });

    if (!result.ok) return res.status(result.status).json({ error: result.error });

    res.status(200).json({
      message: isActive ? "User enabled successfully" : "User disabled successfully",
      data: formatUser(result.value),
    });
  } catch (error) {
    console.error("Error updating user active status:", error);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// ==========================================
// DELETE /api/admin/users/:id - ลบผู้ใช้และข้อมูลทั้งหมดที่เกี่ยวข้อง
// ==========================================
adminUsersRouter.delete("/:id", async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const adminId = req.user!.userId;

  if (!isValidUUID(userId)) {
    return res.status(400).json({ error: "Invalid user ID format" });
  }

  // ป้องกันไม่ให้แอดมินลบบัญชีตัวเองโดยไม่ได้ตั้งใจ
  if (userId === adminId) {
    return res.status(400).json({ error: "Cannot delete your own admin account" });
  }

  try {
    const result = await runAsAdmin(adminId, async (tx, adminName) => {
      const [target] = await tx
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .for("update");

      if (!target) return { ok: false as const, status: 404, error: "User not found" };

      if (target.role === "admin") {
        return {
          ok: false as const,
          status: 400,
          error: "Demote this admin to user before deleting the account",
        };
      }

      await tx.delete(focusSessions).where(eq(focusSessions.userId, userId));
      await tx.delete(userAnimals).where(eq(userAnimals.userId, userId));
      await tx.delete(userEggs).where(eq(userEggs.userId, userId));
      await tx.delete(tasks).where(eq(tasks.userId, userId));
      await tx.delete(categories).where(eq(categories.userId, userId));
      await tx.delete(activities).where(eq(activities.userId, userId));

      // ลบผู้ใช้
      await tx.delete(users).where(eq(users.id, userId));

      await logAdminAction(tx, {
        adminId,
        adminName,
        action: "delete_user",
        targetType: "user",
        targetId: userId,
        details: target.email,
      });

      return { ok: true as const, value: null };
    });

    if (!result.ok) return res.status(result.status).json({ error: result.error });

    res.status(200).json({
      message: "User and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user by admin:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default adminUsersRouter;
