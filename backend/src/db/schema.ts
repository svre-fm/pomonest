import {
  pgTable,
  uuid,
  varchar,
  serial,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { start } from "node:repl";
import { isDataView } from "node:util/types";

//ENUM

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "doing",
  "done",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "completed",
  "cancelled",
]);

export const eggStatusEnum = pgEnum("egg_status", [
  "incubating",
  "hatched",
]);

export const rarityEnum = pgEnum("rarity", [
  "common",
  "rare",
  "epic",
]);

export const userRoleEnum = pgEnum("user_role", [
  "user",
  "admin",
]);

//user table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  username: varchar("username", { length: 50 }).notNull(),

  email: varchar("email", { length: 100 }).notNull().unique(),

  password: varchar("password", { length: 255 }).notNull(),

  avatar: varchar("avatar", { length: 255 }),

  role: userRoleEnum("role").default("user").notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  emailVerified: boolean("email_verified").default(false).notNull(),

  verificationToken: varchar("verification_token", { length: 255 }),

  verificationExpire: timestamp("verification_expire", {
    withTimezone: true,
  }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

//admin_log actions
export const adminLogs = pgTable("admin_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  targetType: varchar("target_type", { length: 30 }).notNull(),
  targetId: varchar("target_id", { length: 64 }),
  details: varchar("details", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// export const userspam = pgTable("user_spam", {
//   id: uuid("id").defaultRandom().primaryKey(),
//   userId: uuid("user_id").references(() => users.id).notNull(),
//   reason: varchar("reason", { length: 255 }).notNull(),
//   dateend: time("dateend", { withTimezone: true }),
//   createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
// });

//categories table
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),

  name: varchar("name", { length: 100 }).notNull(),

  color: varchar("color", { length: 20 }).notNull(),
});


//task table
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),

  categoryId: uuid("category_id").references(() => categories.id),

  title: varchar("title", { length: 255 }),

  status: taskStatusEnum("status").default("todo"),

  dueDate: timestamp("due_date"),

  completedAt: timestamp("completed_at", { withTimezone: true })
});

//quick activity table
export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),

  name: varchar("name", { length: 100 }).notNull(),

  color: varchar("color", { length: 20 }).notNull(),
});

//egg table
export const eggs = pgTable("eggs", {
  id: serial("id").primaryKey(),

  name: varchar("name", { length: 100 }).notNull(),

  required: integer("required").notNull(),

  image: varchar("image", { length: 255 }).notNull(),
});

//egg of user table
export const userEggs = pgTable("user_eggs", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),

  eggId: integer("egg_id")
    .references(() => eggs.id)
    .notNull(),

  progress: integer("progress").default(0).notNull(),

  status: eggStatusEnum("status").default("incubating"),

  startTime: timestamp("start_time", { withTimezone: true }).notNull(),

  hatchedAt: timestamp("hatched_at", { withTimezone: true })
});

//focus sessions table
export const focusSessions = pgTable("focus_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),

  taskId: uuid("task_id").references(() => tasks.id),

  activityId: uuid("activity_id").references(() => activities.id),

  userEggId: uuid("user_egg_id")
    .references(() => userEggs.id)
    .notNull(),

  startTime: timestamp("start_time", { withTimezone: true }).notNull(),

  endTime: timestamp("end_time", { withTimezone: true }).notNull(),

  duration: integer("duration").notNull(),

  status: sessionStatusEnum("status").default("completed"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});


//animal
export const animals = pgTable("animals", {
  id: serial("id").primaryKey(),

  name: varchar("name", { length: 100 }).notNull(),

  rarity: rarityEnum("rarity").default("common"),

  image: varchar("image", { length: 255 }).notNull(),

  animation: varchar("animation", { length: 255 }).notNull()
});

//egg rewards table
export const eggRewards = pgTable("egg_rewards", {
  id: serial("id").primaryKey(),

  eggId:  integer("egg_id")
    .references(() => eggs.id)
    .notNull(),

  animalId: integer("animal_id")
    .references(() => animals.id)
    .notNull(),

  dropRate: integer("drop_rate").notNull(),
});


//user animals
export const userAnimals = pgTable("user_animals", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),

  animalId: integer("animal_id")
    .references(() => animals.id)
    .notNull(),

  nickname: varchar("nickname", { length: 100 }),

  obtainedAt: timestamp("obtained_at", { withTimezone: true }).defaultNow().notNull(),
});
