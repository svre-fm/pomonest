import { Router } from "express";
import type { Request, Response } from "express";
import { desc } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { adminLogs } from "@db/schema.js";

const adminDashboardRouter = Router();

// GET /api/admin/logs - บันทึกการกระทำของ admin ล่าสุด  ?limit=20 (สูงสุด 100)
adminDashboardRouter.get("/logs", async (req: Request, res: Response) => {
  try {
    const limitNum = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));

    const rows = await dbClient
      .select()
      .from(adminLogs)
      .orderBy(desc(adminLogs.createdAt))
      .limit(limitNum);

    res.status(200).json({ message: "Logs fetched successfully", data: rows });
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

export default adminDashboardRouter;