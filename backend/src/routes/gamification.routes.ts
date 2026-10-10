import { Router } from "express";
import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import {
  users,
  categories,
  tasks,
  activities,
  focusSessions,
  eggs,
  animals,
  eggRewards,
  userEggs,
  userAnimals,
} from "@db/schema.js";
import { requireAuth } from "../auth/middleware.js";

const gamificationRouter = Router();

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

// ==========================================
// API: List available data tables
// ==========================================
gamificationRouter.get("/data/tables", (_req: Request, res: Response) => {
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
// API: User Animals (Collection)
// ==========================================

// GET /api/user-animals - ดึงสัตว์ที่ user ครอบครอง
gamificationRouter.get("/user-animals", requireAuth, async (req: Request, res: Response) => {
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
gamificationRouter.get("/eggs", async (_req: Request, res: Response) => {
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
gamificationRouter.get("/animals", async (_req: Request, res: Response) => {
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
gamificationRouter.get("/egg-rewards", async (req: Request, res: Response) => {
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

// POST /api/user-eggs - เริ่มฟักไข่
gamificationRouter.post("/user-eggs", requireAuth, async (req: Request, res: Response) => {
  try {
    const { eggId } = req.body;
    const parsedEggId = Number(eggId);

    if (!eggId || !Number.isInteger(parsedEggId) || parsedEggId <= 0) {
      return res.status(400).json({ error: "eggId must be a valid number" });
    }

    const [eggType] = await dbClient
      .select()
      .from(eggs)
      .where(eq(eggs.id, parsedEggId))
      .limit(1);

    if (!eggType) {
      return res.status(404).json({ error: "Egg type not found" });
    }

    const [newUserEgg] = await dbClient
      .insert(userEggs)
      .values({
        userId: req.user!.userId,
        eggId: parsedEggId,
        progress: 0,
        status: "incubating",
        startTime: new Date(),
      })
      .returning();

    res.status(201).json({
      message: "Started hatching egg",
      data: newUserEgg,
    });
  } catch (error) {
    console.error("Error starting egg:", error);
    res.status(500).json({ error: "Failed to start egg" });
  }
});

// GET /api/user-eggs - ดึงไข่ของ user ที่ login (ประวัติและที่กำลังฟัก)
gamificationRouter.get("/user-eggs", requireAuth, async (req: Request, res: Response) => {
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

export default gamificationRouter;
