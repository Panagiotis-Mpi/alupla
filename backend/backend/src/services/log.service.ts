import { ActivityLog } from "../models/ActivityLog";

export async function logAction(params: {
  user_id?: number | null;
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  details?: object | null;
}) {
  await ActivityLog.create({
    user_id: params.user_id ?? null,
    action: params.action,
    entity_type: params.entity_type ?? null,
    entity_id: params.entity_id ?? null,
    details: params.details ?? null
  });
}
