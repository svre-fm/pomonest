import { Router } from "express";
import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { tasks, categories } from "@db/schema.js";
import { requireAuth } from "../auth/middleware.js";
import { isValidUUID } from "../utils/validators.js";

const tasksRouter = Router();

// ==========================================
// API: Tasks (CRUD)
// ==========================================

// GET /api/tasks - ดึง tasks ทั้งหมดของ user
tasksRouter.get("/", requireAuth, async (req: Request, res: Response) => {
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
tasksRouter.get("/:id", requireAuth, async (req: Request, res: Response) => {
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
tasksRouter.post("/", requireAuth, async (req: Request, res: Response) => {
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
tasksRouter.put("/:id", requireAuth, async (req: Request, res: Response) => {
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

        const [ownedCategory] = await dbClient
          .select()
          .from(categories)
          .where(and(eq(categories.id, categoryId), eq(categories.userId, req.user!.userId)))
          .limit(1);

        if (!ownedCategory) {
          return res.status(404).json({ error: "Category not found" });
        }

        updates.categoryId = categoryId;
      }
    }

    if (dueDate !== undefined) {
      if (dueDate) {
        const parsed = new Date(dueDate);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ error: "Invalid due date format" });
        }
        updates.dueDate = parsed;
      } else {
        updates.dueDate = null;
      }
    }

    // Support both status ('todo' | 'doing' | 'done') and completed (boolean)
    let resolvedStatus = status;
    if (!resolvedStatus && completed !== undefined) {
      resolvedStatus = completed ? "done" : "todo";
    }

    if (resolvedStatus !== undefined) {
      if (!["todo", "doing", "done"].includes(resolvedStatus)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
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
tasksRouter.patch("/:id/status", requireAuth, async (req: Request, res: Response) => {
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
tasksRouter.delete("/:id", requireAuth, async (req: Request, res: Response) => {
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

export default tasksRouter;
