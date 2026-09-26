import { dbClient } from "@db/client.js";
import { animals } from "@db/schema.js";

async function seed() {
    try{
        console.log("Seeding database...");
        await dbClient.insert(animals).values([
            {   
                name: "cat",
                rarity: "common",
                image: "cat.png",
                animation: "A_cat.png"
            },
            {
                name: "dog",
                rarity: "common",
                image: "dog.png",
                animation: "A_dog.png"
            },
            {
                name: "penguin",
                rarity: "common",
                image: "peng.png",
                animation: "A_peng.png"
            },
            {
                name: "fish",
                rarity: "rare",
                image: "fish.png",
                animation: "A_fish.png"
            },
            {
                name: "panda",
                rarity: "rare",
                image: "pan.png",
                animation: "A_pan.png"
            },
            {
                name: "rabbit",
                rarity: "rare",
                image: "rab.png",
                animation: "A_rab.png"
            },
            {
                name: "tiger",
                rarity: "epic",
                image: "tiger.png",
                animation: "A_tiger.png"
            },
            {
                name: "pig",
                rarity: "epic",
                image: "pig.png",
                animation: "A_pig.png"
            },
            {
                name: "kid",
                rarity: "epic",
                image: "kid.png",
                animation: "A_kid.png"
            }

        ]);
    }catch (error) {
        console.error("Error seeding database:", error);
        process.exit(1);
    }
    process.exit(0);
    
}

seed();
