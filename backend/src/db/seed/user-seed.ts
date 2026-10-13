import "dotenv/config";
import { like, inArray } from "drizzle-orm";
import { dbClient, dbConn } from "@db/client.js";
import { users } from "@db/schema.js";
import { hashPassword } from "../../auth/password.ts";

const EMAIL_DOMAIN = "seed.pomonest.test";
const PASSWORD = process.env.SEED_USER_PASSWORD || "Password123!";
const AVATARS = ["/images/profile1.png", "/images/profile2.png", "/images/profile3.png"];

type SeedUser = {
  name: string;
  daysAgo: number; 
  isActive?: boolean; 
  emailVerified?: boolean; 
};

const SEED_USERS: SeedUser[] = [
  // สมัครภายใน 7 วัน
  { name: "somchai", daysAgo: 0 },
  { name: "mali", daysAgo: 1 },
  { name: "ploy", daysAgo: 2 },
  { name: "tong", daysAgo: 3 },
  { name: "nina", daysAgo: 5, emailVerified: false },
  { name: "arm", daysAgo: 6 },
  // 8-30 วัน
  { name: "beam", daysAgo: 9 },
  { name: "fah", daysAgo: 12 },
  { name: "gun", daysAgo: 15, isActive: false },
  { name: "ink", daysAgo: 18 },
  { name: "jane", daysAgo: 21 },
  { name: "kong", daysAgo: 25 },
  { name: "lisa", daysAgo: 28 },
  // 31-90 วัน
  { name: "mind", daysAgo: 35 },
  { name: "nut", daysAgo: 42, emailVerified: false },
  { name: "oat", daysAgo: 50 },
  { name: "pam", daysAgo: 58, isActive: false },
  { name: "quin", daysAgo: 66 },
  { name: "ran", daysAgo: 75 },
  { name: "sai", daysAgo: 85 },
  // 91-365 วัน
  { name: "tan", daysAgo: 100 },
  { name: "umi", daysAgo: 130 },
  { name: "view", daysAgo: 160 },
  { name: "wan", daysAgo: 190 },
  { name: "xing", daysAgo: 220, isActive: false },
  { name: "yok", daysAgo: 260 },
  { name: "zen", daysAgo: 300 },
  { name: "best", daysAgo: 330 },
  { name: "cake", daysAgo: 350 },
  // เกิน 1 ปี (ไม่ควรนับในสถิติ Year)
  { name: "dream", daysAgo: 400 },
  { name: "earth", daysAgo: 500 },
];

const emailOf = (name: string) => `${name}@${EMAIL_DOMAIN}`;

async function reset() {
  const removed = await dbClient
    .delete(users)
    .where(like(users.email, `%@${EMAIL_DOMAIN}`))
    .returning({ email: users.email });
  console.log(`Removed ${removed.length} seeded users.`);
}

async function seedUsers() {
  const emails = SEED_USERS.map((u) => emailOf(u.name));
  const existing = await dbClient
    .select({ email: users.email })
    .from(users)
    .where(inArray(users.email, emails));
  const existingSet = new Set(existing.map((u) => u.email));

  const toInsert = SEED_USERS.filter((u) => !existingSet.has(emailOf(u.name)));
  if (toInsert.length === 0) {
    console.log("Seed users already exist. Nothing to do.");
    return;
  }

  // hash ครั้งเดียวแล้วใช้ร่วมกัน (scrypt ช้าเลยไม่ทำซ้ำทีละคน) — ทุกบัญชี login ด้วยรหัสผ่านเดียวกันได้
  const password = await hashPassword(PASSWORD);
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  await dbClient.insert(users).values(
    toInsert.map((u, i) => ({
      username: u.name,
      email: emailOf(u.name),
      password,
      avatar: AVATARS[i % AVATARS.length],
      role: "user" as const,
      isActive: u.isActive ?? true,
      emailVerified: u.emailVerified ?? true,
      // verificationExpire เว้นเป็น null โดยตั้งใจ: cron cleanup จะลบผู้ใช้ที่ยังไม่ verify และ token หมดอายุ
      // ถ้าเว้นว่างไว้ ผู้ใช้ตัวอย่างที่ยังไม่ยืนยันจะไม่ถูกลบ
      createdAt: new Date(now - u.daysAgo * DAY - (i % 7) * 60 * 60 * 1000),
    })),
  );

  const disabled = toInsert.filter((u) => u.isActive === false).length;
  const unverified = toInsert.filter((u) => u.emailVerified === false).length;
  console.log(
    `Seeded ${toInsert.length} users (${disabled} disabled, ${unverified} unverified).`,
  );
  console.log(`Login with <name>@${EMAIL_DOMAIN} / ${PASSWORD}, e.g. ${emailOf("somchai")}`);
}

const run = process.argv.includes("--reset") ? reset : seedUsers;

run()
  .then(() => dbConn.end())
  .catch(async (error) => {
    console.error("Failed to seed users:", error);
    await dbConn.end();
    process.exit(1);
  });
