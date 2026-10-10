import { Router } from "express";
import type { Request, Response } from "express";
import { and, eq, ilike } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { animals, eggRewards, userAnimals, eggs } from "@db/schema.js";

const adminAnimalsRouter = Router();

const VALID_RARITIES = ["common", "rare", "epic"] as const;

// ==========================================
// GET /api/admin/animals - ดึงรายการสัตว์ทั้งหมด
// รองรับ ?rarity= (common, rare, epic) และ ?search=
// ==========================================
adminAnimalsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { rarity, search } = req.query;

    const conditions = [];

    if (rarity && typeof rarity === "string" && VALID_RARITIES.includes(rarity as any)) {
      conditions.push(eq(animals.rarity, rarity as "common" | "rare" | "epic"));
    }

    if (search && typeof search === "string" && search.trim()) {
      conditions.push(ilike(animals.name, `%${search.trim()}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allAnimals = await dbClient
      .select()
      .from(animals)
      .where(whereClause);

    // ดึงข้อมูลว่าสัตว์แต่ละตัวผูกกับไข่ใบไหนบ้าง
    const allRewards = await dbClient
      .select({
        animalId: eggRewards.animalId,
        eggId: eggs.id,
        eggName: eggs.name,
        dropRate: eggRewards.dropRate,
      })
      .from(eggRewards)
      .innerJoin(eggs, eq(eggRewards.eggId, eggs.id));

    const animalsWithEggs = allAnimals.map((animal) => {
      const droppedFrom = allRewards.filter((r) => r.animalId === animal.id);
      return {
        ...animal,
        droppedFromEggs: droppedFrom,
      };
    });

    res.status(200).json({
      message: "Animals fetched successfully",
      data: animalsWithEggs,
    });
  } catch (error) {
    console.error("Error fetching animals for admin:", error);
    res.status(500).json({ error: "Failed to fetch animals" });
  }
});

// ==========================================
// GET /api/admin/animals/:id - ดึงข้อมูลสัตว์ตัวเดี่ยว
// ==========================================
adminAnimalsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const animalId = Number(req.params.id);

    if (isNaN(animalId) || animalId <= 0) {
      return res.status(400).json({ error: "Invalid animal ID format" });
    }

    const [animal] = await dbClient
      .select()
      .from(animals)
      .where(eq(animals.id, animalId))
      .limit(1);

    if (!animal) {
      return res.status(404).json({ error: "Animal not found" });
    }

    // ดึงรายการไข่ที่ดรอปสัตว์ตัวนี้
    const droppedFrom = await dbClient
      .select({
        rewardId: eggRewards.id,
        eggId: eggs.id,
        eggName: eggs.name,
        dropRate: eggRewards.dropRate,
      })
      .from(eggRewards)
      .innerJoin(eggs, eq(eggRewards.eggId, eggs.id))
      .where(eq(eggRewards.animalId, animalId));

    res.status(200).json({
      message: "Animal details fetched successfully",
      data: {
        ...animal,
        droppedFromEggs: droppedFrom,
      },
    });
  } catch (error) {
    console.error("Error fetching single animal:", error);
    res.status(500).json({ error: "Failed to fetch animal" });
  }
});

// ==========================================
// POST /api/admin/animals - เพิ่มสัตว์ตัวใหม่
// ==========================================
adminAnimalsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name, rarity = "common", image, animation } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Animal name is required" });
    }

    if (!VALID_RARITIES.includes(rarity)) {
      return res.status(400).json({
        error: `Invalid rarity. Must be one of: ${VALID_RARITIES.join(", ")}`,
      });
    }

    if (!image || typeof image !== "string" || !image.trim()) {
      return res.status(400).json({ error: "Animal image is required" });
    }

    if (!animation || typeof animation !== "string" || !animation.trim()) {
      return res.status(400).json({ error: "Animal animation filename is required" });
    }

    const [newAnimal] = await dbClient
      .insert(animals)
      .values({
        name: name.trim(),
        rarity,
        image: image.trim(),
        animation: animation.trim(),
      })
      .returning();

    res.status(201).json({
      message: "Animal created successfully",
      data: newAnimal,
    });
  } catch (error) {
    console.error("Error creating animal by admin:", error);
    res.status(500).json({ error: "Failed to create animal" });
  }
});

// ==========================================
// PUT /api/admin/animals/:id - แก้ไขข้อมูลสัตว์
// ==========================================
adminAnimalsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const animalId = Number(req.params.id);

    if (isNaN(animalId) || animalId <= 0) {
      return res.status(400).json({ error: "Invalid animal ID format" });
    }

    const [existing] = await dbClient
      .select()
      .from(animals)
      .where(eq(animals.id, animalId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Animal not found" });
    }

    const { name, rarity, image, animation } = req.body;
    const updates: Partial<typeof animals.$inferInsert> = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ error: "Animal name cannot be empty" });
      }
      updates.name = trimmed;
    }

    if (rarity !== undefined) {
      if (!VALID_RARITIES.includes(rarity)) {
        return res.status(400).json({
          error: `Invalid rarity. Must be one of: ${VALID_RARITIES.join(", ")}`,
        });
      }
      updates.rarity = rarity;
    }

    if (image !== undefined) {
      const trimmed = String(image).trim();
      if (!trimmed) {
        return res.status(400).json({ error: "Image cannot be empty" });
      }
      updates.image = trimmed;
    }

    if (animation !== undefined) {
      const trimmed = String(animation).trim();
      if (!trimmed) {
        return res.status(400).json({ error: "Animation cannot be empty" });
      }
      updates.animation = trimmed;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const [updated] = await dbClient
      .update(animals)
      .set(updates)
      .where(eq(animals.id, animalId))
      .returning();

    res.status(200).json({
      message: "Animal updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating animal by admin:", error);
    res.status(500).json({ error: "Failed to update animal" });
  }
});

// ==========================================
// DELETE /api/admin/animals/:id - ลบสัตว์ออกจากระบบ
// ==========================================
adminAnimalsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const animalId = Number(req.params.id);

    if (isNaN(animalId) || animalId <= 0) {
      return res.status(400).json({ error: "Invalid animal ID format" });
    }

    const [existing] = await dbClient
      .select()
      .from(animals)
      .where(eq(animals.id, animalId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Animal not found" });
    }

    // ลบการผูกใน egg_rewards และ user_animals ที่อ้างอิงสัตว์ตัวนี้
    await dbClient.delete(eggRewards).where(eq(eggRewards.animalId, animalId));
    await dbClient.delete(userAnimals).where(eq(userAnimals.animalId, animalId));

    // ลบสัตว์
    await dbClient.delete(animals).where(eq(animals.id, animalId));

    res.status(200).json({
      message: "Animal and related records deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting animal by admin:", error);
    res.status(500).json({ error: "Failed to delete animal" });
  }
});

export default adminAnimalsRouter;
