
import "dotenv/config";
import { dbClient } from "@db/client.js";
import { eggs, animals, eggRewards, rarities } from "@db/schema.js";

async function seed() {
  console.log("Seeding master data (eggs, animals, egg_rewards)...");

  try {
    // 1. Rarities
    await dbClient
      .insert(rarities)
      .values(["common", "rare", "epic"].map((name) => ({ name })))
      .onConflictDoNothing();

    // Skip if master eggs already exist
    const existingEggs = await dbClient.select().from(eggs);

    if (existingEggs.length > 0) {
      console.log("Master data already exists! Skipping seed.");
      process.exit(0);
    }

    // 2. Eggs
    const [commonEgg] = await dbClient
      .insert(eggs)
      .values({
        name: "common Egg",
        rarity: "common",
        required: 1,
        image: "common.png",
      })
      .returning();

    const [rareEgg] = await dbClient
      .insert(eggs)
      .values({
        name: "rare Egg",
        rarity: "rare",
        required: 60,
        image: "rare.png",
      })
      .returning();

    const [epicEgg] = await dbClient
      .insert(eggs)
      .values({
        name: "epic Egg",
        rarity: "epic",
        required: 120,
        image: "epic.png",
      })
      .returning();

    console.log("Seeded 3 eggs");

    // 3. Animals (no rarity)
    const insertedAnimals = await dbClient
      .insert(animals)
      .values([
        { name: "Cat", image: "cat.PNG", animation: "A_cat.PNG" },
        { name: "Dog", image: "dog.PNG", animation: "A_dog.png" },
        { name: "Penguin", image: "peng.PNG", animation: "A_peng.PNG" },
        { name: "Fish", image: "fish.PNG", animation: "A_fish.PNG" },
        { name: "Panda", image: "pan.PNG", animation: "A_pan.PNG" },
        { name: "Rabbit", image: "rab.PNG", animation: "A_rab.PNG" },
        { name: "Tiger", image: "tiger.PNG", animation: "A_tiger.PNG" },
        { name: "Pig", image: "pig.PNG", animation: "A_pig.PNG" },
        { name: "Kid", image: "kid.PNG", animation: "A_kid.PNG" },
      ])
      .returning();

    console.log(`Seeded ${insertedAnimals.length} animals`);

    // 4. Map animal names to their IDs
    const animalId = new Map(
      insertedAnimals.map((animal) => [animal.name, animal.id]),
    );

    // 5. Define rewards for each egg
    const rewardConfig = [
      {
        eggId: commonEgg.id,
        animals: [
          { name: "Cat", dropRate: 34 },
          { name: "Dog", dropRate: 33 },
          { name: "Penguin", dropRate: 33 },
        ],
      },
      {
        eggId: rareEgg.id,
        animals: [
          { name: "Fish", dropRate: 50 },
          { name: "Panda", dropRate: 30 },
          { name: "Rabbit", dropRate: 20 },
        ],
      },
      {
        eggId: epicEgg.id,
        animals: [
          { name: "Tiger", dropRate: 40 },
          { name: "Pig", dropRate: 35 },
          { name: "Kid", dropRate: 25 },
        ],
      },
    ];

    const rewardRecords: {
      eggId: number;
      animalId: number;
      dropRate: number;
    }[] = [];

    for (const config of rewardConfig) {
      for (const reward of config.animals) {
        const id = animalId.get(reward.name);

        if (id === undefined) {
          throw new Error(`Animal "${reward.name}" not found`);
        }

        rewardRecords.push({
          eggId: config.eggId,
          animalId: id,
          dropRate: reward.dropRate,
        });
      }
    }

    await dbClient.insert(eggRewards).values(rewardRecords);

    console.log(`Seeded ${rewardRecords.length} egg rewards`);
    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
