import { Router } from "express";
import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { activities } from "@db/schema.js";
import { requireAuth } from "../auth/middleware.js";
import { isValidUUID } from "../utils/validators.js";

const activitiesRouter = Router();

// ==========================================
// API: Activities
// ==========================================

// GET /api/activities - ดึง activities ทั้งหมดของ user
activitiesRouter.get("/", requireAuth, async (req: Request, res: Response) => {
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
activitiesRouter.get("/:id", requireAuth, async (req: Request, res: Response) => {
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
activitiesRouter.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    let resolvedName = "Quick Focus";
    if (name !== undefined && name !== null) {
      if (typeof name !== "string") {
        return res.status(400).json({ error: "Activity name must be a string" });
      }
      const trimmed = name.trim();
      if (trimmed) {
        resolvedName = trimmed;
      }
    }

    const [newActivity] = await dbClient
      .insert(activities)
      .values({
        userId: req.user!.userId,
        name: resolvedName,
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
activitiesRouter.put("/:id", requireAuth, async (req: Request, res: Response) => {
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
activitiesRouter.delete("/:id", requireAuth, async (req: Request, res: Response) => {
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

export default activitiesRouter;
