import type { GameType, SessionStatus, TableStatus } from "@prisma/client";
import type { ConflictRecord, SessionRecord, TableRecord } from "@/server/repositories/types";

export type InMemoryStore = {
  tables: Map<string, TableRecord>;
  sessions: Map<string, SessionRecord>;
  conflicts: Map<string, ConflictRecord[]>;
  auditLogs: Array<{ action: string; entityId: string }>;
  events: Array<{ name: string; entityId: string }>;
};

export function createStore(): InMemoryStore {
  const tables = new Map<string, TableRecord>([
    table("table_available", "AVAILABLE"),
    table("table_cleaning", "CLEANING"),
    table("table_occupied", "OCCUPIED")
  ]);

  const sessions = new Map<string, SessionRecord>([
    [
      "session_conflicting",
      {
        id: "session_conflicting",
        businessId: "business_1",
        tableId: "table_occupied",
        status: "ACTIVE",
        startedAt: new Date("2026-07-23T10:00:00.000Z"),
        plannedEndAt: new Date("2026-07-23T11:00:00.000Z")
      }
    ]
  ]);

  return {
    tables,
    sessions,
    conflicts: new Map([
      [
        "table_occupied",
        [
          {
            id: "booking_1",
            kind: "booking",
            startsAt: new Date("2026-07-23T11:00:00.000Z"),
            endsAt: new Date("2026-07-23T12:00:00.000Z")
          }
        ]
      ]
    ]),
    auditLogs: [],
    events: []
  };
}

function table(id: string, status: TableStatus): [string, TableRecord] {
  return [
    id,
    {
      id,
      businessId: "business_1",
      number: id,
      gameType: "POOL" as GameType,
      status,
      pricingGroup: "standard"
    }
  ];
}

export function createHarnessRepositories(store: InMemoryStore) {
  return {
    tables: {
      async findBoardTables() {
        return [];
      },
      async findByIdForUpdate({ tableId }: { tableId: string }) {
        return store.tables.get(tableId) ?? null;
      },
      async updateStatus({ tableId, status }: { tableId: string; status: TableStatus }) {
        const tableRecord = store.tables.get(tableId);
        if (tableRecord) {
          tableRecord.status = status;
        }
      }
    },
    sessions: {
      async createWalkInSession(input: { tableId: string; businessId: string; startedAt: Date; plannedEndAt: Date }) {
        const sessionId = `session_${store.sessions.size + 1}`;
        store.sessions.set(sessionId, {
          id: sessionId,
          businessId: input.businessId,
          tableId: input.tableId,
          status: "ACTIVE" as SessionStatus,
          startedAt: input.startedAt,
          plannedEndAt: input.plannedEndAt
        });
        return { sessionId };
      },
      async findActiveByTable({ tableId }: { tableId: string }) {
        return [...store.sessions.values()].find((session) => session.tableId === tableId && ["ACTIVE", "PAUSED"].includes(session.status)) ?? null;
      },
      async findByIdForUpdate({ sessionId }: { sessionId: string }) {
        return store.sessions.get(sessionId) ?? null;
      },
      async findConflicts({ tableId, startsAt, endsAt }: { tableId: string; startsAt: Date; endsAt: Date }) {
        return (store.conflicts.get(tableId) ?? []).filter((conflict) => conflict.startsAt < endsAt && conflict.endsAt > startsAt);
      },
      async updateStatus({ sessionId, status }: { sessionId: string; status: SessionStatus }) {
        const session = store.sessions.get(sessionId);
        if (session) {
          session.status = status;
        }
      },
      async extend({ sessionId, newPlannedEndAt }: { sessionId: string; newPlannedEndAt: Date }) {
        const session = store.sessions.get(sessionId);
        if (session) {
          session.plannedEndAt = newPlannedEndAt;
        }
      },
      async end({ sessionId }: { sessionId: string }) {
        const session = store.sessions.get(sessionId);
        if (session) {
          session.status = "COMPLETED" as SessionStatus;
        }
      }
    },
    auditLogs: {
      async record({ action, entityId }: { action: string; entityId: string }) {
        store.auditLogs.push({ action, entityId });
      }
    },
    events: {
      async publish({ name, entityId }: { name: string; entityId: string }) {
        store.events.push({ name, entityId });
      }
    },
    transaction: async <T>(callback: (tx: unknown) => Promise<T>) => callback({})
  };
}
