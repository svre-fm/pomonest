import { Router } from "express";
import type { Request, Response } from "express";
import { and, eq, ne, sql } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { eggs, eggRewards, animals, userEggs } from "@db/schema.js";

const adminEggsRouter = Router();

// ชื่อไข่ห้ามซ้ำ เพราะชื่อไข่ใช้บอก rarity ของสัตว์
async function isEggNameTaken(name: string, excludeId?: number): Promise<boolean> {
  const sameName = sql`lower(${eggs.name}) = ${name.toLowerCase()}`;
  const [found] = await dbClient
    .select({ id: eggs.id })
    .from(eggs)
    .where(excludeId === undefined ? sameName : and(sameName, ne(eggs.id, excludeId)))
    .limit(1);
  return !!found;
}

// ดึง rarity จากคำแรกของชื่อไข่
function getRarityFromEggName(name: string): string {
  return name.trim().split(/\s+/)[0].toLowerCase();
}

// ==========================================
// GET /api/admin/eggs - ดึงรายการไข่ทั้งหมด พร้อมจำนวนรางวัลที่ผูกอยู่
// ==========================================
adminEggsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const allEggs = await dbClient.select().from(eggs);

    // ดึงจำนวน rewards ของแต่ละไข่
    const allRewards = await dbClient.select().from(eggRewards);

    const eggsWithStats = allEggs.map((egg) => {
      const rewardsForEgg = allRewards.filter((r) => r.eggId === egg.id);
      const totalDropWeight = rewardsForEgg.reduce((sum, r) => sum + r.dropRate, 0);
      return {
        ...egg,
        rewardsCount: rewardsForEgg.length,
        totalDropWeight,
      };
    });

    res.status(200).json({
      message: "Eggs fetched successfully",
      data: eggsWithStats,
    });
  } catch (error) {
    console.error("Error fetching eggs for admin:", error);
    res.status(500).json({ error: "Failed to fetch eggs" });
  }
});

// ==========================================
// GET /api/admin/eggs/:id - ดึงข้อมูลไข่พร้อมรางวัลทั้งหมดของไข่นี้
// ==========================================
adminEggsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const eggId = Number(req.params.id);

    if (isNaN(eggId) || eggId <= 0) {
      return res.status(400).json({ error: "Invalid egg ID format" });
    }

    const [egg] = await dbClient
      .select()
      .from(eggs)
      .where(eq(eggs.id, eggId))
      .limit(1);

    if (!egg) {
      return res.status(404).json({ error: "Egg not found" });
    }

    const rewards = await dbClient
      .select({
        rewardId: eggRewards.id,
        dropRate: eggRewards.dropRate,
        animalId: animals.id,
        animalName: animals.name,
        animalRarity: eggs.rarity,
        animalImage: animals.image,
        animalAnimation: animals.animation,
      })
      .from(eggRewards)
      .innerJoin(animals, eq(eggRewards.animalId, animals.id))
      .where(eq(eggRewards.eggId, eggId));

    res.status(200).json({
      message: "Egg details fetched successfully",
      data: {
        ...egg,
        rewards,
      },
    });
  } catch (error) {
    console.error("Error fetching single egg:", error);
    res.status(500).json({ error: "Failed to fetch egg" });
  }
});

// ==========================================
// POST /api/admin/eggs - เพิ่มไข่ใหม่
// ==========================================
adminEggsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name, required, image } = req.body;
    const updates: Partial<typeof eggs.$inferInsert> = {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Egg name is required" });
    }

    const trimmedName = name.trim();
    const rarity = getRarityFromEggName(trimmedName);

    const parsedRequired = Number(required);
    if (!Number.isInteger(parsedRequired) || parsedRequired <= 0) {
      return res.status(400).json({
        error: "Required minutes must be a positive whole number",
      });
    }

    if (!image || typeof image !== "string" || !image.trim()) {
      return res.status(400).json({
        error: "Image filename or path is required",
      });
    }

    if (await isEggNameTaken(trimmedName)) {
      return res.status(409).json({
        error: `An egg named "${trimmedName}" already exists`,
      });
    }

    const [newEgg] = await dbClient
      .insert(eggs)
      .values({
        name: trimmedName,
        rarity,
        required: parsedRequired,
        image: image.trim(),
      })
      .returning();

    return res.status(201).json({
      message: "Egg created successfully",
      data: newEgg,
    });
  } catch (error) {
    console.error("Error creating egg by admin:", error);
    return res.status(500).json({ error: "Failed to create egg" });
  }
});

// ==========================================
// PUT /api/admin/eggs/:id - แก้ไขข้อมูลไข่
// ==========================================
adminEggsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const eggId = Number(req.params.id);

    if (isNaN(eggId) || eggId <= 0) {
      return res.status(400).json({ error: "Invalid egg ID format" });
    }

    const [existing] = await dbClient
      .select()
      .from(eggs)
      .where(eq(eggs.id, eggId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Egg not found" });
    }

    const { name, required, image } = req.body;
    const updates: Partial<typeof eggs.$inferInsert> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          error: "Egg name cannot be empty",
        });
      }

      const trimmedName = name.trim();

      if (await isEggNameTaken(trimmedName, eggId)) {
        return res.status(409).json({
          error: `An egg named "${trimmedName}" already exists`,
        });
      }

      updates.name = trimmedName;
      updates.rarity = getRarityFromEggName(trimmedName);
    }

    if (required !== undefined) {
      const parsedRequired = Number(required);
      if (isNaN(parsedRequired) || parsedRequired <= 0) {
        return res.status(400).json({ error: "Required minutes must be a positive number" });
      }
      updates.required = parsedRequired;
    }

    if (image !== undefined) {
      const trimmed = String(image).trim();
      if (!trimmed) {
        return res.status(400).json({ error: "Image filename cannot be empty" });
      }
      updates.image = trimmed;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const [updated] = await dbClient
      .update(eggs)
      .set(updates)
      .where(eq(eggs.id, eggId))
      .returning();

    res.status(200).json({
      message: "Egg updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating egg by admin:", error);
    res.status(500).json({ error: "Failed to update egg" });
  }
});

// ==========================================
// DELETE /api/admin/eggs/:id - ลบไข่
// ==========================================
adminEggsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const eggId = Number(req.params.id);

    if (isNaN(eggId) || eggId <= 0) {
      return res.status(400).json({ error: "Invalid egg ID format" });
    }

    const [existing] = await dbClient
      .select()
      .from(eggs)
      .where(eq(eggs.id, eggId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Egg not found" });
    }

    // ตรวจสอบว่ามีผู้ใช้กำลังฟักไข่ใบนี้อยู่หรือไม่
    const [incubatingEgg] = await dbClient
      .select({ id: userEggs.id })
      .from(userEggs)
      .where(sql`${userEggs.eggId} = ${eggId} AND ${userEggs.status} = 'incubating'`)
      .limit(1);

    if (incubatingEgg) {
      return res.status(400).json({
        error: "Cannot delete this egg because users are currently incubating it.",
      });
    }

    await dbClient.delete(eggRewards).where(eq(eggRewards.eggId, eggId));
    await dbClient.delete(eggs).where(eq(eggs.id, eggId));

    res.status(200).json({
      message: "Egg and associated rewards deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting egg by admin:", error);
    res.status(500).json({ error: "Failed to delete egg" });
  }
});

export default adminEggsRouter;
