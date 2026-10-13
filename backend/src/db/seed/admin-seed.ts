import "dotenv/config";
import { eq } from "drizzle-orm";
import { dbClient, dbConn } from "@db/client.js";
import { users } from "@db/schema.js";
import { hashPassword } from "../../auth/password.ts";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  const username = process.env.ADMIN_USERNAME?.trim() || "admin";

  if (!email || !password) {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD are not set. Skipping.");
    return;
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  const [existing] = await dbClient
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    // Update existing user to admin
    await dbClient
      .update(users)
      .set({
        avatar: "profile1.png",
        role: "admin",
        isActive: true,
        emailVerified: true,
        verificationToken: null,
        verificationExpire: null,
      })
      .where(eq(users.id, existing.id));
    console.log(`Existing user ${email} is now an admin.`);
    return;
  }

  await dbClient.insert(users).values({
    username,
    email,
    password: await hashPassword(password),
    emailVerified: true,
    role: "admin",
    avatar: "profile1.png",
  });
  console.log(`Admin user ${email} created.`);
}

seedAdmin()
  .then(() => dbConn.end())
  .catch(async (error) => {
    console.error("Failed to seed admin:", error);
    await dbConn.end();
    process.exit(1);
  });