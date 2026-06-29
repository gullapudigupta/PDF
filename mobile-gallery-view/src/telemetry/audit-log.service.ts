export interface CleanupAuditEvent {
  id: string;
  timestamp: string;
  action: "dry-run" | "confirmed-delete" | "empty-folder-cleanup";
  payload: Record<string, unknown>;
}

export class AuditLogService {
  private readonly events: CleanupAuditEvent[] = [];

  record(action: CleanupAuditEvent["action"], payload: Record<string, unknown>): CleanupAuditEvent {
    const event: CleanupAuditEvent = {
      id: `audit-${Date.now()}-${this.events.length + 1}`,
      timestamp: new Date().toISOString(),
      action,
      payload,
    };
    this.events.push(event);
    return event;
  }

  list(): CleanupAuditEvent[] {
    return [...this.events];
  }
}
