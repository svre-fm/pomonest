import { Router } from "express";
import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { eggRewards, eggs, animals } from "@db/schema.js";

const adminRewardsRouter = Router();

// ==========================================
// GET /api/admin/egg-rewards - ดึงรายการรางวัลไข่ทั้งหมด (กรองตาม ?eggId= ได้)
// ==========================================
adminRewardsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { eggId } = req.query;

    const query = dbClient
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

    if (eggId) {
      const parsedEggId = Number(eggId);
      if (!isNaN(parsedEggId) && parsedEggId > 0) {
        const results = await query.where(eq(eggRewards.eggId, parsedEggId));
        return res.status(200).json({
          message: "Egg rewards fetched successfully",
          data: results,
        });
      }
    }

    const allRewards = await query;
    res.status(200).json({
      message: "Egg rewards fetched successfully",
      data: allRewards,
    });
  } catch (error) {
    console.error("Error fetching egg rewards for admin:", error);
    res.status(500).json({ error: "Failed to fetch egg rewards" });
  }
});

// ==========================================
// GET /api/admin/egg-rewards/:id - ดึงรายการรางวัลเดี่ยว
// ==========================================
adminRewardsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const rewardId = Number(req.params.id);

    if (isNaN(rewardId) || rewardId <= 0) {
      return res.status(400).json({ error: "Invalid reward ID format" });
    }

    const [reward] = await dbClient
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
      .innerJoin(animals, eq(eggRewards.animalId, animals.id))
      .where(eq(eggRewards.id, rewardId))
      .limit(1);

    if (!reward) {
      return res.status(404).json({ error: "Egg reward not found" });
    }

    res.status(200).json({
      message: "Egg reward fetched successfully",
      data: reward,
    });
  } catch (error) {
    console.error("Error fetching single egg reward:", error);
    res.status(500).json({ error: "Failed to fetch egg reward" });
  }
});

// ==========================================
// POST /api/admin/egg-rewards - ผูกสัตว์เข้ากับไข่ พร้อมระบุอัตราดรอป
// ==========================================
adminRewardsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { eggId, animalId, dropRate } = req.body;

    const parsedEggId = Number(eggId);
    const parsedAnimalId = Number(animalId);
    const parsedDropRate = Number(dropRate);

    if (isNaN(parsedEggId) || parsedEggId <= 0) {
      return res.status(400).json({ error: "Invalid eggId" });
    }

    if (isNaN(parsedAnimalId) || parsedAnimalId <= 0) {
      return res.status(400).json({ error: "Invalid animalId" });
    }

    if (isNaN(parsedDropRate) || parsedDropRate <= 0) {
      return res.status(400).json({ error: "dropRate must be a positive number" });
    }

    // ตรวจสอบว่ามีไข่และสัตว์นี้อยู่จริง
    const [eggExists] = await dbClient.select({ id: eggs.id }).from(eggs).where(eq(eggs.id, parsedEggId)).limit(1);
    if (!eggExists) {
      return res.status(404).json({ error: "Egg not found" });
    }

    const [animalExists] = await dbClient.select({ id: animals.id }).from(animals).where(eq(animals.id, parsedAnimalId)).limit(1);
    if (!animalExists) {
      return res.status(404).json({ error: "Animal not found" });
    }

    // ตรวจสอบว่าสัตว์ตัวนี้ถูกผูกกับไข่ใบนี้ไว้แล้วหรือไม่
    const [alreadyLinked] = await dbClient
      .select({ id: eggRewards.id })
      .from(eggRewards)
      .where(and(eq(eggRewards.eggId, parsedEggId), eq(eggRewards.animalId, parsedAnimalId)))
      .limit(1);

    if (alreadyLinked) {
      return res.status(409).json({ error: "This animal is already linked to this egg. Update its drop rate instead." });
    }

    const [newReward] = await dbClient
      .insert(eggRewards)
      .values({
        eggId: parsedEggId,
        animalId: parsedAnimalId,
        dropRate: parsedDropRate,
      })
      .returning();

    res.status(201).json({
      message: "Animal successfully linked to egg reward pool",
      data: newReward,
    });
  } catch (error) {
    console.error("Error creating egg reward by admin:", error);
    res.status(500).json({ error: "Failed to create egg reward" });
  }
});

// ==========================================
// PUT /api/admin/egg-rewards/:id - ปรับอัตราดรอป (dropRate)
// ==========================================
adminRewardsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const rewardId = Number(req.params.id);

    if (isNaN(rewardId) || rewardId <= 0) {
      return res.status(400).json({ error: "Invalid reward ID format" });
    }

    const { dropRate } = req.body;
    const parsedDropRate = Number(dropRate);

    if (isNaN(parsedDropRate) || parsedDropRate <= 0) {
      return res.status(400).json({ error: "dropRate must be a positive number" });
    }

    const [existing] = await dbClient
      .select()
      .from(eggRewards)
      .where(eq(eggRewards.id, rewardId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Egg reward not found" });
    }

    const [updated] = await dbClient
      .update(eggRewards)
      .set({ dropRate: parsedDropRate })
      .where(eq(eggRewards.id, rewardId))
      .returning();

    res.status(200).json({
      message: "Drop rate updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating egg reward by admin:", error);
    res.status(500).json({ error: "Failed to update egg reward" });
  }
});

// ==========================================
// DELETE /api/admin/egg-rewards/:id - ปลดสัตว์ออกจากรายการสุ่มของไข่
// ==========================================
adminRewardsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const rewardId = Number(req.params.id);

    if (isNaN(rewardId) || rewardId <= 0) {
      return res.status(400).json({ error: "Invalid reward ID format" });
    }

    const [existing] = await dbClient
      .select()
      .from(eggRewards)
      .where(eq(eggRewards.id, rewardId))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: "Egg reward not found" });
    }

    await dbClient.delete(eggRewards).where(eq(eggRewards.id, rewardId));

    res.status(200).json({
      message: "Animal removed from egg rewards successfully",
    });
  } catch (error) {
    console.error("Error deleting egg reward by admin:", error);
    res.status(500).json({ error: "Failed to delete egg reward" });
  }
});

export default adminRewardsRouter;
