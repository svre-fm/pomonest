
import { Router } from "express";
import type { Request, Response } from "express";
import {
  and,
  eq,
  gte,
  lt,
} from "drizzle-orm";

import { dbClient } from "@db/client.js";
import {
  focusSessions,
  tasks,
  categories,
  activities,
  userEggs,
} from "@db/schema.js";
import { requireAuth } from "../auth/middleware.js";

const statisticsRouter = Router();

type ViewMode = "week" | "month" | "year";

const TIME_ZONE = "Asia/Bangkok";

function getDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getPeriod(mode: ViewMode, selectedDate: string) {
  const now = new Date();

  // ใช้วันที่ที่เลือก หรือ Today ถ้าไม่ได้ส่งวันที่มา
  const anchor =
    selectedDate && selectedDate !== "Today"
      ? new Date(`${selectedDate}T12:00:00+07:00`)
      : now;

  if (Number.isNaN(anchor.getTime())) {
    throw new Error("Invalid date");
  }

  const dateKey = getDateKey(anchor);
  const [year, month, day] = dateKey.split("-").map(Number);

  // คำนวณช่วงเวลาในเขตเวลาไทย
  const start = new Date(
    Date.UTC(year, month - 1, day, -7, 0, 0),
  );

  if (mode === "week") {
    const weekday = new Date(
      Date.UTC(year, month - 1, day),
    ).getUTCDay();

    const daysSinceMonday = (weekday + 6) % 7;
    start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  } else if (mode === "month") {
    start.setUTCDate(1);
  } else {
    start.setUTCMonth(0, 1);
  }

  const end = new Date(start);

  if (mode === "week") {
    end.setUTCDate(end.getUTCDate() + 7);
  } else if (mode === "month") {
    end.setUTCMonth(end.getUTCMonth() + 1);
  } else {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  }

  return { start, end };
}

function formatFocusTime(totalSeconds: number): string {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function getHeatmapLabels(
  mode: ViewMode,
  start: Date,
  end: Date,
) {
  const labels: { key: string; label: string }[] = [];

  // รายปี: แสดง 12 เดือน
  if (mode === "year") {
    const year = start.getUTCFullYear();

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(
        Date.UTC(year, month, 1, -7, 0, 0),
      );

      labels.push({
        key: `${year}-${String(month + 1).padStart(2, "0")}-01`,
        label: new Intl.DateTimeFormat("en", {
          month: "short",
          timeZone: TIME_ZONE,
        }).format(monthStart),
      });
    }

    return labels;
  }

  // รายสัปดาห์และรายเดือน: แสดงเป็นวัน
  const cursor = new Date(start);

  while (cursor < end) {
    const key = getDateKey(cursor);

    let label: string;

    if (mode === "week") {
      label = new Intl.DateTimeFormat("en", {
        weekday: "short",
        timeZone: TIME_ZONE,
      }).format(cursor);
    } else {
      label = String(
        Number(
          new Intl.DateTimeFormat("en", {
            day: "numeric",
            timeZone: TIME_ZONE,
          }).format(cursor),
        ),
      );
    }

    labels.push({ key, label });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return labels;
}

statisticsRouter.get(
  "/",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      const modeValue = req.query.mode ?? "week";
      const mode = String(modeValue) as ViewMode;

      if (!["week", "month", "year"].includes(mode)) {
        return res.status(400).json({
          error: "mode must be week, month, or year",
        });
      }

      const selectedDate =
        typeof req.query.date === "string"
          ? req.query.date
          : "Today";

      if (
        selectedDate !== "Today" &&
        !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
      ) {
        return res.status(400).json({
          error: "date must be Today or YYYY-MM-DD",
        });
      }

      const { start, end } = getPeriod(mode, selectedDate);

      // 1. ดึง Focus Sessions ที่สำเร็จในช่วงเวลาที่เลือก
      const sessions = await dbClient
        .select({
          duration: focusSessions.duration,
          startTime: focusSessions.startTime,
          categoryName: categories.name,
          categoryColor: categories.color,
          activityName: activities.name,
          activityColor: activities.color,
        })
        .from(focusSessions)
        .leftJoin(tasks, eq(focusSessions.taskId, tasks.id))
        .leftJoin(
          categories,
          eq(tasks.categoryId, categories.id),
        )
        .leftJoin(
          activities,
          eq(focusSessions.activityId, activities.id),
        )
        .where(
          and(
            eq(focusSessions.userId, userId),
            eq(focusSessions.status, "completed"),
            gte(focusSessions.startTime, start),
            lt(focusSessions.startTime, end),
          ),
        );

      // 2. นับ Tasks ที่เสร็จในช่วงเวลานี้
      const completedTaskRows = await dbClient
        .select({ completedAt: tasks.completedAt })
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            eq(tasks.status, "done"),
            gte(tasks.completedAt, start),
            lt(tasks.completedAt, end),
          ),
        );

      // 3. นับไข่ที่ฟักสำเร็จในช่วงเวลานี้
      const hatchedEggRows = await dbClient
        .select({ id: userEggs.id })
        .from(userEggs)
        .where(
          and(
            eq(userEggs.userId, userId),
            eq(userEggs.status, "hatched"),
            gte(userEggs.hatchedAt, start),
            lt(userEggs.hatchedAt, end),
          ),
        );

        //4. สร้าง Heatmap
        const dailySeconds = new Map<string, number>();

        for (const session of sessions) {
        const key = getDateKey(session.startTime);

        dailySeconds.set(
            key,
            (dailySeconds.get(key) ?? 0) + session.duration,
        );
        }

        const heatmap = getHeatmapLabels(mode, start, end).map(
        ({ key, label }) => {
            let seconds = 0;

            if (mode === "year") {
            const monthPrefix = key.slice(0, 7);

            for (const [dateKey, value] of dailySeconds) {
                if (dateKey.startsWith(monthPrefix)) {
                seconds += value;
                }
            }
            } else {
            seconds = dailySeconds.get(key) ?? 0;
            }

            return {
            label,
            minutes: Math.floor(seconds / 60),
            };
        },
        );

      // 5. รวมเวลาตาม Category หรือ Activity
      const categoryMap = new Map<
        string,
        { name: string; color: string; seconds: number }
      >();

      for (const session of sessions) {
        const name =
          session.categoryName ??
          session.activityName ??
          "Other";

        const color =
          session.categoryColor ??
          session.activityColor ??
          "#A8B89A";

        const current = categoryMap.get(name);

        if (current) {
          current.seconds += session.duration;
        } else {
          categoryMap.set(name, {
            name,
            color,
            seconds: session.duration,
          });
        }
      }

      const totalSeconds = sessions.reduce(
        (sum, session) => sum + session.duration,
        0,
      );

      const categoriesData = Array.from(
        categoryMap.values(),
      )
        .map((category) => ({
          name: category.name,
          color: category.color,
          seconds: category.seconds,
          percent:
            totalSeconds > 0
              ? Math.round(
                  (category.seconds / totalSeconds) * 100,
                )
              : 0,
        }))
        .sort((a, b) => b.seconds - a.seconds);

      const title =
        mode === "week"
          ? "This Week"
          : mode === "month"
            ? "This Month"
            : "This Year";

      return res.status(200).json({
        summary: {
          title,
          totalFocus: formatFocusTime(totalSeconds),
          completedTasks: completedTaskRows.length,
          eggsHatched: hatchedEggRows.length,
          totalMinutes: Math.floor(totalSeconds / 60),
        },
        heatmap,
        categories: categoriesData,
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);

      return res.status(500).json({
        error: "Failed to fetch statistics",
      });
    }
  },
);

export default statisticsRouter;
