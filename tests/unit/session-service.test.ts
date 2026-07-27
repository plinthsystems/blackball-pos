import { describe, expect, it } from "vitest";
import type { DomainError } from "@/server/domain/errors";
import { createSessionServiceForTests } from "./support/session-service-harness";

describe("SessionService", () => {
  it("starts a walk-in session only when the table is available", async () => {
    const { service, store } = createSessionServiceForTests();

    const result = await service.startWalkInSession({
      businessId: "business_1",
      employeeId: "employee_1",
      tableId: "table_available",
      durationMinutes: 60,
      now: new Date("2026-07-23T10:00:00.000Z")
    });

    expect(result.sessionId).toBeDefined();
    expect(store.tables.get("table_available")?.status).toBe("OCCUPIED");
  });

  it("rejects an extension that overlaps a future confirmed booking", async () => {
    const { service } = createSessionServiceForTests();

    await expect(
      service.extendSession({
        businessId: "business_1",
        employeeId: "employee_1",
        sessionId: "session_conflicting",
        addedMinutes: 60,
        now: new Date("2026-07-23T10:30:00.000Z")
      })
    ).rejects.toMatchObject({
      code: "EXTENSION_CONFLICT"
    } satisfies Partial<DomainError>);
  });

  it("ends a session by making the table available again", async () => {
    const { service, store } = createSessionServiceForTests();
    const started = await service.startWalkInSession({
      businessId: "business_1",
      employeeId: "employee_1",
      tableId: "table_available",
      durationMinutes: 60,
      now: new Date("2026-07-23T10:00:00.000Z")
    });

    await service.endSession({
      businessId: "business_1",
      employeeId: "employee_1",
      sessionId: started.sessionId,
      now: new Date("2026-07-23T10:30:00.000Z")
    });

    expect(store.tables.get("table_available")?.status).toBe("AVAILABLE");
  });
});
