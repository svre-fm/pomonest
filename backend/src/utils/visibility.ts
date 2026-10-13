import type { Request } from "express";
import { and, eq, sql } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { users, eggs, eggRewards, animals } from "@db/schema.js";

// admin ที่เปิดโหมดทดสอบอยู่ = เห็นไข่/สัตว์ที่ยังไม่ public ได้
// เช็กจากฐานข้อมูลทุกครั้ง (role + testMode) ไม่เชื่อ header/ค่าจาก client
export async function canSeeUnreleased(req: Request): Promise<boolean> {
  if (!req.user) return false;
  const [account] = await dbClient
    .select({ role: users.role, isActive: users.isActive, testMode: users.testMode })
    .from(users)
    .where(eq(users.id, req.user.userId))
    .limit(1);
  return !!account && account.isActive && account.role === "admin" && account.testMode;
}

// ไข่ที่ user มองเห็นและเริ่มฟักได้: เปิด public แล้ว และมีสัตว์ที่ public ผูกอยู่อย่างน้อย 1 ตัว
// (กันไข่ที่สุ่มไม่ได้ แม้ข้อมูลจะหลุดเงื่อนไขจากการลบ/ปลดสัตว์)
export const releasedEgg = () =>
  and(
    eq(eggs.isPublic, true),
    sql`exists (
      select 1 from ${eggRewards}
      inner join ${animals} on ${animals.id} = ${eggRewards.animalId}
      where ${eggRewards.eggId} = ${eggs.id} and ${animals.isPublic} = true
    )`,
  );

// ไข่ที่ public อยู่ แต่จะไม่เหลือสัตว์ public เลย ถ้าเอาสัตว์ตัวนี้ออก (ปลด public / ลบ / ปลดจากไข่)
// onlyEggId = ตรวจเฉพาะไข่ใบเดียว (ใช้ตอนปลดสัตว์ออกจากไข่ใบนั้น)
export async function eggsLeftWithoutPublicAnimal(
  animalId: number,
  onlyEggId?: number,
): Promise<string[]> {
  const rows = await dbClient
    .select({ name: eggs.name })
    .from(eggs)
    .where(
      and(
        eq(eggs.isPublic, true),
        onlyEggId === undefined ? undefined : eq(eggs.id, onlyEggId),
        sql`exists (
          select 1 from ${eggRewards}
          where ${eggRewards.eggId} = ${eggs.id} and ${eggRewards.animalId} = ${animalId}
        )`,
        sql`not exists (
          select 1 from ${eggRewards} er2
          inner join ${animals} a2 on a2.id = er2.animal_id
          where er2.egg_id = ${eggs.id} and a2.is_public = true and er2.animal_id <> ${animalId}
        )`,
      ),
    );
  return rows.map((r) => r.name);
}
