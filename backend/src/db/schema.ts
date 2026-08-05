import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { start } from "node:repl";

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

//user table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  username: varchar("username", { length: 50 }).notNull(),

  email: varchar("email", { length: 100 }).notNull().unique(),

  password: varchar("password", { length: 255 }).notNull(),

  avatar: varchar("avatar", { length: 255 }),

  emailVerified: boolean("email_verified").default(false).notNull(),

  verificationToken: varchar("verification_token", { length: 255 }),

  verificationExpire: timestamp("verification_expire"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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
  id: uuid("id").defaultRandom().primaryKey(),

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

  eggId: uuid("egg_id")
    .references(() => eggs.id)
    .notNull(),

  progress: integer("progress").default(0).notNull(),

  status: eggStatusEnum("status").default("incubating"),

  startTime: timestamp("start_time", { withTimezone: true }).notNull(),

  hatchedAt: timestamp("hatched_at", { withTimezone: true }).notNull(),
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
  id: uuid("id").defaultRandom().primaryKey(),

  name: varchar("name", { length: 100 }).notNull(),

  rarity: rarityEnum("rarity").default("common"),

  image: varchar("image", { length: 255 }).notNull(),
});

//egg rewards table
export const eggRewards = pgTable("egg_rewards", {
  id: uuid("id").defaultRandom().primaryKey(),

  eggId: uuid("egg_id")
    .references(() => eggs.id)
    .notNull(),

  animalId: uuid("animal_id")
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

  animalId: uuid("animal_id")
    .references(() => animals.id)
    .notNull(),

  nickname: varchar("nickname", { length: 100 }),

  obtainedAt: timestamp("obtained_at", { withTimezone: true }).defaultNow().notNull(),
});
