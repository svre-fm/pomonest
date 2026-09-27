import "dotenv/config";
import { dbClient } from "@db/client.js";
import { eggs, animals, eggRewards } from "@db/schema.js";

async function seed() {
  console.log("🌱 Seeding master data (eggs, animals, egg_rewards)...");

  try {
    const existingEggs = await dbClient.select().from(eggs);
    if (existingEggs.length > 0) {
      console.log("Master data already exists! Skipping seed.");
      process.exit(0);
    }

    // 1. Eggs
    const [commonEgg] = await dbClient
      .insert(eggs)
      .values({
        name: "common Egg",
        required: 30,
        image: "common.png",
      })
      .returning();

    const [rareEgg] = await dbClient
      .insert(eggs)
      .values({
        name: "rare Egg",
        required: 60,
        image: "rare.png",
      })
      .returning();

    const [epicEgg] = await dbClient
      .insert(eggs)
      .values({
        name: "epic Egg",
        required: 120,
        image: "epic.png",
      })
      .returning();

    console.log("Seeded 3 eggs");

    // 2. Animals
    const insertedAnimals = await dbClient
      .insert(animals)
      .values([
        { name: "Cat", rarity: "common", image: "cat.PNG", animation: "A_cat.PNG" },
        { name: "Dog", rarity: "common", image: "dog.PNG", animation: "A_dog.png" },
        { name: "Penguin", rarity: "common", image: "peng.PNG", animation: "A_peng.PNG" },
        { name: "Fish", rarity: "rare", image: "fish.PNG", animation: "A_fish.PNG" },
        { name: "Panda", rarity: "rare", image: "pan.PNG", animation: "A_pan.PNG" },
        { name: "Rabbit", rarity: "rare", image: "rab.PNG", animation: "A_rab.PNG" },
        { name: "Tiger", rarity: "epic", image: "tiger.PNG", animation: "A_tiger.PNG" },
        { name: "Pig", rarity: "epic", image: "pig.PNG", animation: "A_pig.PNG" },
        { name: "Kid", rarity: "epic", image: "kid.PNG", animation: "A_kid.PNG" },
      ])
      .returning();

    console.log(`✅ Seeded ${insertedAnimals.length} animals`);

    // 3. Egg Rewards
    const rareDropRates: Record<string, number> = {
      Fish: 50,  
      Panda: 30,
      Rabbit: 20,
    };

    const commonDropRates: Record<string, number> = {
      Cat: 34,
      Dog: 33,
      Penguin: 33,
    };

    const epicDropRates: Record<string, number> = {
      Tiger: 40,
      Pig: 35,
      Kid: 25,
    };

    const cAnimals = insertedAnimals.filter((a) => a.rarity === "common");
    const rAnimals = insertedAnimals.filter((a) => a.rarity === "rare");
    const eAnimals = insertedAnimals.filter((a) => a.rarity === "epic");

    const rewardRecords = [];

    for (const ca of cAnimals) {
      rewardRecords.push({
        eggId: commonEgg.id,
        animalId: ca.id,
        dropRate: commonDropRates[ca.name] ?? 33,
      });
    }

    for (const ra of rAnimals) {
      rewardRecords.push({
        eggId: rareEgg.id,
        animalId: ra.id,
        dropRate: rareDropRates[ra.name] ?? 33,
      });
    }

    for (const ea of eAnimals) {
      rewardRecords.push({
        eggId: epicEgg.id,
        animalId: ea.id,
        dropRate: epicDropRates[ea.name] ?? 33,
      });
    }

    if (rewardRecords.length > 0) {
        await dbClient.insert(eggRewards).values(rewardRecords);
    }

    console.log(`Seeded ${rewardRecords.length} egg rewards`);
    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
