import { Router } from "express";
import type { Request, Response } from "express";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { users, focusSessions, userEggs, userAnimals, adminLogs } from "@db/schema.js";

const adminDashboardRouter = Router();

const TIME_ZONE = "Asia/Bangkok";
const TZ_OFFSET = "+07:00"; // Asia/Bangkok ไม่มี daylight saving จึงใช้ offset คงที่ได้
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_MONTH_BUCKETS = 60; // range=all แสดงกราฟย้อนหลังสูงสุด 60 เดือน

type Range = "all" | "week" | "month" | "year";

const pad = (n: number) => String(n).padStart(2, "0");

// วันที่ตามเวลาไทย รูปแบบ YYYY-MM-DD
const bangkokDay = (ms: number) =>
  new Date(ms).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

// รายชื่อเดือน (YYYY-MM) ตั้งแต่ firstMonth ถึง currentMonth
function monthLabels(firstMonth: string, currentMonth: string): string[] {
  const [fy, fm] = firstMonth.split("-").map(Number);
  const [cy, cm] = currentMonth.split("-").map(Number);
  const total = cy * 12 + cm - (fy * 12 + fm) + 1;
  return Array.from({ length: total }, (_, i) => {
    const idx = fy * 12 + (fm - 1) + i;
    return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
  });
}

// เดือนที่อยู่ก่อนหน้า n เดือน
function monthsBack(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) - n;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

/**
 * วางแผนช่วงเวลาของแต่ละ range (หน้าต่างย้อนหลัง ไม่ใช่สัปดาห์/เดือน/ปีตามปฏิทิน)
 *   week  = 7 วันล่าสุด (รายวัน)      month = 30 วันล่าสุด (รายวัน)
 *   year  = 12 เดือนล่าสุด (รายเดือน)  all   = ทั้งหมด (กราฟรายเดือน ย้อนหลังสูงสุด 60 เดือน)
 * statsSince = เริ่มนับตัวเลขสรุป (null = นับทั้งหมด), chartSince = เริ่มของแท่งแรกในกราฟ
 */
function planRange(range: Range, now: number, earliestMs: number | null) {
  if (range === "week" || range === "month") {
    const days = range === "week" ? 7 : 30;
    const labels = Array.from({ length: days }, (_, i) => bangkokDay(now - (days - 1 - i) * DAY_MS));
    const since = new Date(`${labels[0]}T00:00:00${TZ_OFFSET}`);
    return { granularity: "day" as const, labels, statsSince: since, chartSince: since };
  }

  const currentMonth = bangkokDay(now).slice(0, 7);
  let labels: string[];
  if (range === "year") {
    labels = monthLabels(monthsBack(currentMonth, 11), currentMonth);
  } else {
    const firstMonth = earliestMs === null ? currentMonth : bangkokDay(earliestMs).slice(0, 7);
    labels = monthLabels(firstMonth, currentMonth).slice(-MAX_MONTH_BUCKETS);
  }
  const chartSince = new Date(`${labels[0]}-01T00:00:00${TZ_OFFSET}`);
  return {
    granularity: "month" as const,
    labels,
    statsSince: range === "year" ? chartSince : null,
    chartSince,
  };
}

// ==========================================
// GET /api/admin/stats?range=all|week|month|year (ค่าเริ่มต้น all)
// ตัวเลขผู้ใช้รวม (total/verified/...) เป็นยอดปัจจุบัน ไม่ถูกกรองตาม range
// ส่วน session / สัตว์ / ไข่ที่ฟัก / กราฟ / ผู้ใช้ใหม่ ถูกกรองตาม range
// ==========================================
adminDashboardRouter.get("/stats", async (req: Request, res: Response) => {
  const rangeParam = req.query.range === undefined ? "all" : req.query.range;
  if (rangeParam !== "all" && rangeParam !== "week" && rangeParam !== "month" && rangeParam !== "year") {
    return res.status(400).json({ error: "range must be one of: all, week, month, year" });
  }
  const range: Range = rangeParam;

  try {
    const now = Date.now();

    // range=all ต้องรู้ว่า session แรกเกิดเมื่อไหร่ เพื่อกำหนดจำนวนแท่งของกราฟ
    let earliestMs: number | null = null;
    if (range === "all") {
      const [row] = await dbClient
        .select({ first: sql<number | null>`(extract(epoch from min(${focusSessions.startTime})))::float8` })
        .from(focusSessions);
      earliestMs = row?.first != null ? row.first * 1000 : null;
    }

    const plan = planRange(range, now, earliestMs);
    const sinceIso = plan.statsSince ? plan.statsSince.toISOString() : null;

    // เขียนรูปแบบวันที่ติดไว้ใน SQL ตรงๆ (ไม่ผ่าน ${}) เพื่อให้เป็น literal ไม่ใช่ parameter
    const bucket =
      plan.granularity === "day"
        ? sql<string>`to_char(${focusSessions.startTime} at time zone 'Asia/Bangkok', 'YYYY-MM-DD')`
        : sql<string>`to_char(${focusSessions.startTime} at time zone 'Asia/Bangkok', 'YYYY-MM')`;

    // Date ใน sql`` ต้องส่งเป็นสตริง ISO แล้ว cast เอง (driver ไม่แปลง Date ให้)
    const newInRange = sinceIso
      ? sql<number>`(count(*) filter (where ${users.createdAt} >= ${sinceIso}::timestamptz))::int`
      : sql<number>`(count(*))::int`;

    const hatched = sinceIso
      ? sql<number>`(count(*) filter (where ${userEggs.status} = 'hatched' and ${userEggs.hatchedAt} >= ${sinceIso}::timestamptz))::int`
      : sql<number>`(count(*) filter (where ${userEggs.status} = 'hatched'))::int`;

    const [[userStats], [sessionStats], [eggStats], [animalStats], bucketRows] = await Promise.all([
      dbClient
        .select({
          total: count(),
          verified: sql<number>`(count(*) filter (where ${users.emailVerified}))::int`,
          disabled: sql<number>`(count(*) filter (where not ${users.isActive}))::int`,
          admins: sql<number>`(count(*) filter (where ${users.role} = 'admin'))::int`,
          newInRange,
        })
        .from(users),
      dbClient
        .select({
          total: count(),
          completed: sql<number>`(count(*) filter (where ${focusSessions.status} = 'completed'))::int`,
          cancelled: sql<number>`(count(*) filter (where ${focusSessions.status} = 'cancelled'))::int`,
          focusSeconds: sql<number>`(coalesce(sum(${focusSessions.duration}) filter (where ${focusSessions.status} = 'completed'), 0))::int`,
        })
        .from(focusSessions)
        .where(plan.statsSince ? gte(focusSessions.startTime, plan.statsSince) : undefined),
      dbClient
        .select({
          hatched,
          incubating: sql<number>`(count(*) filter (where ${userEggs.status} = 'incubating'))::int`,
        })
        .from(userEggs),
      dbClient
        .select({ total: count() })
        .from(userAnimals)
        .where(plan.statsSince ? gte(userAnimals.obtainedAt, plan.statsSince) : undefined),
      // กราฟนับเฉพาะ session ที่ทำสำเร็จ (สอดคล้องกับ Total Focus Time)
      dbClient
        .select({
          label: bucket,
          sessions: count(),
          seconds: sql<number>`(coalesce(sum(${focusSessions.duration}), 0))::int`,
        })
        .from(focusSessions)
        .where(and(gte(focusSessions.startTime, plan.chartSince), eq(focusSessions.status, "completed")))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
    ]);

    // เติมช่วงเวลาที่ไม่มีข้อมูลให้เป็น 0 เพื่อให้กราฟครบทุกแท่งเสมอ
    const byLabel = new Map(bucketRows.map((r) => [r.label, r]));
    const points = plan.labels.map((label) => ({
      label,
      sessions: byLabel.get(label)?.sessions ?? 0,
      seconds: byLabel.get(label)?.seconds ?? 0,
    }));

    res.status(200).json({
      message: "Stats fetched successfully",
      data: {
        range,
        users: { ...userStats, notVerified: userStats.total - userStats.verified },
        sessions: sessionStats,
        eggs: eggStats,
        animalsCollected: animalStats?.total ?? 0,
        activity: { granularity: plan.granularity, points },
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ==========================================
// GET /api/admin/logs - บันทึกการกระทำของ admin ล่าสุด  ?limit=20 (สูงสุด 100)
// ==========================================
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