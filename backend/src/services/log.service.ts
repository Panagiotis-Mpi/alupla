import type { Transaction } from "sequelize";
import { ActivityLog } from "../models/ActivityLog";
import { User } from "../models/User";
import { clearRouteCaches } from "../utils/routeCache";

type LogActionParams = {
  user_id?: number | null;
  action: string;
  entity_type?: string | null;
  details?: Record<string, unknown> | null;
  transaction?: Transaction;
};

// Συμπληρώνει στοιχεία χρήστη στα logs, εκτός από update αποφοίτου.
async function buildLogDetails(userId: number | null, action: string, details: Record<string, unknown> | null | undefined, transaction?: Transaction) {
  const nextDetails: Record<string, unknown> = details && typeof details === "object" ? { ...details } : {};
  const includeActorDetails = action !== "update_graduate" && action !== "create_user";

  if (!includeActorDetails) return Object.keys(nextDetails).length ? nextDetails : null;

  if (!userId) {
    if (!nextDetails.actor_role) nextDetails.actor_role = "visitor";
    return Object.keys(nextDetails).length ? nextDetails : null;
  }

  if (!nextDetails.actor_role || !nextDetails.actor_name || !nextDetails.actor_email) {
    const user = await User.findByPk(userId, { attributes: ["id", "role", "first_name", "last_name", "email"], ...(transaction ? { transaction } : {}) });
    if (user) {
      if (!nextDetails.actor_role) nextDetails.actor_role = user.role;
      const fullName = `${String(user.first_name ?? "").trim()} ${String(user.last_name ?? "").trim()}`.trim();
      if (!nextDetails.actor_name && fullName) nextDetails.actor_name = fullName;
      if (!nextDetails.actor_email && user.email) nextDetails.actor_email = user.email;
    }
  }

  return Object.keys(nextDetails).length ? nextDetails : null;
}

// Κεντρική function για καταγραφή ενεργειών στο activity_logs.
export async function logAction(params: LogActionParams) {
  const userId = params.user_id ?? null;
  const payload = {
    user_id: userId,
    action: params.action,
    entity_type: params.entity_type ?? null,
    details: await buildLogDetails(userId, params.action, params.details, params.transaction),
  };

  await ActivityLog.create(payload, params.transaction ? { transaction: params.transaction } : undefined);
  if (!params.transaction) {
    await clearRouteCaches(["activity-logs", "activity-log-summary"]);
  }
}
