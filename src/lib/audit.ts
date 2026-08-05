import "server-only";
import { db } from "./db";

type AuditArgs = {
  actorId?: string | null;
  actorLabel: string; // email of the acting user, or "system"
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
};

export async function audit(args: AuditArgs) {
  await db.auditLog.create({
    data: {
      actorId: args.actorId ?? null,
      actorLabel: args.actorLabel,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      details: args.details,
    },
  });
}
