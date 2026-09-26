import "dotenv/config";
import { dbClient } from "./client.js";
import { eggs, animals, eggRewards } from "./schema.js";

async function seed() {
  console.log("🌱 Seeding master data (eggs, animals, egg_rewards)...");

  try {
    const existingEggs = await dbClient.select().from(eggs);
    if (existingEggs.length > 0) {
      console.log("⚠️ Master data already exists! Skipping seed.");
      process.exit(0);
    }

    // 1. Eggs
    const [commonEgg] = await dbClient
      .insert(eggs)
      .values({
        name: "Small Egg",
        required: 60,
        image: "/images/eggs/common.png",
      })
      .returning();

    const [rareEgg] = await dbClient
      .insert(eggs)
      .values({
        name: "Cutie Egg",
        required: 120,
        image: "/images/eggs/rare.png",
      })
      .returning();

    const [epicEgg] = await dbClient
      .insert(eggs)
      .values({
        name: "Fantastic Egg",
        required: 240,
        image: "/images/eggs/epic.png",
      })
      .returning();

    console.log("✅ Seeded 3 eggs (Small, Cutie, Fantastic)");

    // 2. Animals
    const insertedAnimals = await dbClient
      .insert(animals)
      .values([
        { name: "Chick", rarity: "common", image: "/images/eggs/c1.png" },
        { name: "Bunny", rarity: "common", image: "/images/eggs/c2.png" },
        { name: "Duckling", rarity: "common", image: "/images/eggs/c3.png" },
        { name: "Fox", rarity: "rare", image: "/images/eggs/r1.png" },
        { name: "Panda", rarity: "rare", image: "/images/eggs/r2.png" },
        { name: "Koala", rarity: "rare", image: "/images/eggs/r3.png" },
        { name: "Dragon", rarity: "epic", image: "/images/eggs/e1.png" },
        { name: "Phoenix", rarity: "epic", image: "/images/eggs/e2.png" },
        { name: "Unicorn", rarity: "epic", image: "/images/eggs/e3.png" },
      ])
      .returning();

    console.log(`✅ Seeded ${insertedAnimals.length} animals`);

    // 3. Egg Rewards
    const cAnimals = insertedAnimals.filter((a) => a.rarity === "common");
    const rAnimals = insertedAnimals.filter((a) => a.rarity === "rare");
    const eAnimals = insertedAnimals.filter((a) => a.rarity === "epic");

    const rewardRecords = [];
    for (const ca of cAnimals) {
      rewardRecords.push({ eggId: commonEgg.id, animalId: ca.id, dropRate: 33 });
    }
    for (const ra of rAnimals) {
      rewardRecords.push({ eggId: rareEgg.id, animalId: ra.id, dropRate: 33 });
    }
    for (const ea of eAnimals) {
      rewardRecords.push({ eggId: epicEgg.id, animalId: ea.id, dropRate: 33 });
    }

    if (rewardRecords.length > 0) {
      await dbClient.insert(eggRewards).values(rewardRecords);
    }

    console.log(`✅ Seeded ${rewardRecords.length} egg rewards`);
    console.log("🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
