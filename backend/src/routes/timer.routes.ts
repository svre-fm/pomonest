import { Router } from "express";
import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import {
  focusSessions,
  userEggs,
  eggs,
  eggRewards,
  userAnimals,
  animals,
} from "@db/schema.js";
import { requireAuth } from "../auth/middleware.js";
import { isValidUUID } from "../utils/validators.js";

const timerRouter = Router();

const VALID_SESSION_STATUS = ["completed", "cancelled"] as const;

// ==========================================
// API: Save focus session (called on Stop)
// ==========================================
timerRouter.post("/save", requireAuth, async (req: Request, res: Response) => {
  try {
    const { taskId, activityId, userEggId, startTime, endTime, duration, status } = req.body;
    const userId = req.user!.userId;

    if (!userEggId || typeof userEggId !== "string" || !isValidUUID(userEggId)) {
      return res.status(400).json({ error: "Invalid userEggId" });
    }

    // ← แก้ตรงนี้: ระบุ field เองชัดเจน ไม่พึ่ง shape ของ join ที่เดาไม่ได้
    const [userEggRow] = await dbClient
      .select({
        id: userEggs.id,
        eggId: userEggs.eggId,
        progress: userEggs.progress,
        status: userEggs.status,
        required: eggs.required,
      })
      .from(userEggs)
      .innerJoin(eggs, eq(userEggs.eggId, eggs.id))
      .where(and(eq(userEggs.id, userEggId), eq(userEggs.userId, userId)))
      .limit(1);

    if (!userEggRow) {
      return res.status(404).json({ error: "User egg not found" });
    }

    const resolvedStatus = ["completed", "cancelled"].includes(status) ? status : "completed";

    const parsedStart = new Date(startTime);
    const parsedEnd = new Date(endTime);
    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ error: "Invalid startTime or endTime" });
    }

    const [newSession] = await dbClient
      .insert(focusSessions)
      .values({
        userId,
        taskId: taskId ?? null,
        activityId: activityId ?? null,
        userEggId,
        startTime: parsedStart,
        endTime: parsedEnd,
        duration,
        status: resolvedStatus,
      })
      .returning();

    let hatchedAnimal = null;

    if (resolvedStatus === "completed") {
      const newProgress = userEggRow.progress + duration;   // ← ใช้ userEggRow ตรงๆ ไม่ต้องเดา key
      const requiredSeconds = userEggRow.required * 60;
      const isFullyHatched = newProgress >= requiredSeconds;

      console.log('DEBUG hatch check:', { newProgress, requiredSeconds, isFullyHatched, currentStatus: userEggRow.status });

      if (isFullyHatched && userEggRow.status !== "hatched") {
        const rewards = await dbClient
          .select()
          .from(eggRewards)
          .where(eq(eggRewards.eggId, userEggRow.eggId));

        console.log('DEBUG rewards found:', rewards.length);

        if (rewards.length > 0) {
          const totalWeight = rewards.reduce((sum, r) => sum + r.dropRate, 0);
          let roll = Math.random() * totalWeight;
          let picked = rewards[rewards.length - 1];

          for (const reward of rewards) {
            if (roll < reward.dropRate) {
              picked = reward;
              break;
            }
            roll -= reward.dropRate;
          }

          const [newUserAnimal] = await dbClient
            .insert(userAnimals)
            .values({ userId, animalId: picked.animalId })
            .returning();

          const [animalInfo] = await dbClient
            .select()
            .from(animals)
            .where(eq(animals.id, picked.animalId))
            .limit(1);

          hatchedAnimal = { ...newUserAnimal, name: animalInfo?.name, image: animalInfo?.image };
        }

        await dbClient
          .update(userEggs)
          .set({ progress: newProgress, status: "hatched", hatchedAt: new Date() })
          .where(eq(userEggs.id, userEggId));
      } else {
        await dbClient
          .update(userEggs)
          .set({ progress: newProgress })
          .where(eq(userEggs.id, userEggId));
      }
    }

    res.status(201).json({
      message: "Focus session saved successfully!",
      data: { session: newSession, hatchedAnimal },
    });
  } catch (error) {
    console.error("Error saving session:", error);
    res.status(500).json({ error: "Failed to save session" });
  }
});

// ==========================================
// API: Get all focus session history of current user
// ==========================================
timerRouter.get("/history", requireAuth, async (req: Request, res: Response) => {
  try {
    const history = await dbClient
      .select()
      .from(focusSessions)
      .where(eq(focusSessions.userId, req.user!.userId))
      .orderBy(desc(focusSessions.createdAt));

    res.status(200).json({
      message: "History fetched successfully!",
      data: history,
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default timerRouter;
