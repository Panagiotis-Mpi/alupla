import { ActivityLog } from "../models/ActivityLog";

type LogActionParams = {
  user_id?: number | null;
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  details?: object | null;
};

export async function logAction(params: LogActionParams) {
  const payload = {
    user_id: params.user_id ?? null,
    action: params.action,
    entity_type: params.entity_type ?? null,
    entity_id: params.entity_id ?? null,
    details: params.details ?? null,
  };

  await ActivityLog.create(payload);
}
