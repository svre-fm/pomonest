import { and, eq } from "drizzle-orm";
import { dbClient } from "@db/client.js";
import { users, adminLogs } from "@db/schema.js";

export type Tx = Parameters<Parameters<typeof dbClient.transaction>[0]>[0];

export type AdminResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export async function runAsAdmin<T>(
  adminId: string,
  work: (tx: Tx, adminName: string) => Promise<AdminResult<T>>,
): Promise<AdminResult<T>> {
  return dbClient.transaction(async (tx) => {
    const admins = await tx
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.isActive, true)))
      .for("update");

    const me = admins.find((a) => a.id === adminId);
    if (!me) {
      return { ok: false, status: 403, error: "Admin access required." };
    }
    return work(tx, me.username);
  });
}

type LogEntry = {
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
};

export async function logAdminAction(tx: Tx, entry: LogEntry): Promise<void> {
  await tx.insert(adminLogs).values({
    adminId: entry.adminId,
    adminName: entry.adminName,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    details: entry.details ? entry.details.slice(0, 255) : null,
  });
}