import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import type { AuditEvent } from "@/lib/audit";
import { databasePool } from "./database";

export type AuditActor = { id: string; name: string; username: string };

export async function recordAudit(connection: PoolConnection, actor: AuditActor, action: string, targetType: string, targetId: string, summary: string): Promise<void> {
  await connection.execute("INSERT INTO ac_audit_events (id, actor_id, actor_name, actor_username, action, target_type, target_id, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [randomUUID(), actor.id, actor.name, actor.username, action, targetType, targetId, summary]);
}

type AuditRow = RowDataPacket & {
  id: string; occurred_at: Date; actor_name: string; actor_username: string;
  action: string; target_type: string; target_id: string; summary: string;
};

export async function listAuditEvents(): Promise<AuditEvent[]> {
  const [rows] = await databasePool().query<AuditRow[]>("SELECT id, occurred_at, actor_name, actor_username, action, target_type, target_id, summary FROM ac_audit_events ORDER BY occurred_at DESC, id DESC LIMIT 100");
  return rows.map((row) => ({ id: row.id, occurredAt: row.occurred_at.toISOString(), actorName: row.actor_name, actorUsername: row.actor_username,
    action: row.action, targetType: row.target_type, targetId: row.target_id, summary: row.summary }));
}
