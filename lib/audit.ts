export type AuditEvent = {
  id: string;
  occurredAt: string;
  actorName: string;
  actorUsername: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
};
