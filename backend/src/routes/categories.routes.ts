import { Router } from "express";
import type { Request, Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { categories, tasks } from "@db/schema.js";
import { requireAuth } from "../auth/middleware.js";

const categoriesRouter = Router();

// ==========================================
// API: Categories (CRUD)
// ==========================================

// GET /api/categories - ดึง categories ของ user ที่ login
categoriesRouter.get("/", requireAuth, async (req: Request, res: Response) => {
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
categoriesRouter.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const trimmedName = name.trim();
    const finalColor = color ? String(color).trim() : "#7fa65a";

    //check category duplicate
    const [duplicate_name] = await dbClient
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, req.user!.userId),
          sql`lower(${categories.name}) = lower(${trimmedName})`
        )
      )
      .limit(1);

    const [duplicate_color] = await dbClient
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, req.user!.userId),
          sql`lower(${categories.color}) = lower(${finalColor})`
        )
      )
      .limit(1);
    
    if (duplicate_color || duplicate_name) {
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
categoriesRouter.put("/:id", requireAuth, async (req: Request, res: Response) => {
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
categoriesRouter.delete("/:id", requireAuth, async (req: Request, res: Response) => {
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

export default categoriesRouter;
