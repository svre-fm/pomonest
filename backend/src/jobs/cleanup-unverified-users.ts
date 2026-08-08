import cron from "node-cron";
import { and, eq, lt, isNotNull } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { users } from "@db/schema.js";

export function startCleanupJob() {
  cron.schedule("* * * * *", async () => {
    try {
        const deletedUsers = await dbClient
        .delete(users)
        .where(
            and(
            eq(users.emailVerified, false),
            isNotNull(users.verificationExpire),
            lt(users.verificationExpire, new Date())
            )
        )
        .returning({
            username: users.username,
            email: users.email,
        });

        if (deletedUsers.length > 0) {
            deletedUsers.forEach((user) => {
                console.log(
                `Deleted user: ${user.username} (${user.email})`
                );
            });
        }

    } catch (err) {
      console.error(err);
    }
  });
}