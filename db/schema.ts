import {
  pgTable,
  timestamp,
  serial,
  varchar,
  integer,
} from "drizzle-orm/pg-core";

export const focusSessions = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),

  startTime: timestamp("start_time").notNull(),

  endTime: timestamp("end_time").notNull(),

  duration: integer("duration").notNull(),

  status: varchar("status", { length: 20 })
    .default("completed")
    .notNull(),
});