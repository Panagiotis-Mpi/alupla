import { ActivityLog } from "../models/ActivityLog";
import { User } from "../models/User";

type LogActionParams = {
  user_id?: number | null;
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  details?: Record<string, unknown> | null;
};

async function buildLogDetails(userId: number | null, details: Record<string, unknown> | null | undefined) {
  const nextDetails: Record<string, unknown> = details && typeof details === "object" ? { ...details } : {};

  if (!userId) {
    if (!nextDetails.actor_role) nextDetails.actor_role = "visitor";
    return Object.keys(nextDetails).length ? nextDetails : null;
  }

  if (!nextDetails.actor_role || !nextDetails.actor_name || !nextDetails.actor_email) {
    const user = await User.findByPk(userId, { attributes: ["id", "role", "first_name", "last_name", "email"] });
    if (user) {
      if (!nextDetails.actor_role) nextDetails.actor_role = user.role;
      const fullName = `${String(user.first_name ?? "").trim()} ${String(user.last_name ?? "").trim()}`.trim();
      if (!nextDetails.actor_name && fullName) nextDetails.actor_name = fullName;
      if (!nextDetails.actor_email && user.email) nextDetails.actor_email = user.email;
    }
  }

  return Object.keys(nextDetails).length ? nextDetails : null;
}

export async function logAction(params: LogActionParams) {
  const userId = params.user_id ?? null;
  const payload = {
    user_id: userId,
    action: params.action,
    entity_type: params.entity_type ?? null,
    entity_id: params.entity_id ?? null,
    details: await buildLogDetails(userId, params.details),
  };

  await ActivityLog.create(payload);
}
