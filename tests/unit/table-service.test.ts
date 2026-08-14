import { describe, expect, it } from "vitest";
import type { DomainError } from "@/server/domain/errors";
import { createTableServiceForTests } from "./support/table-service-harness";

describe("TableService", () => {
  it("moves a cleaning table back to available", async () => {
    const { service, store } = createTableServiceForTests();

    await service.updateOperationalStatus({
      businessId: "business_1",
      employeeId: "employee_1",
      tableId: "table_cleaning",
      status: "AVAILABLE"
    });

    expect(store.tables.get("table_cleaning")?.status).toBe("AVAILABLE");
  });

  it("rejects an occupied table maintenance transition", async () => {
    const { service } = createTableServiceForTests();

    await expect(
      service.updateOperationalStatus({
        businessId: "business_1",
        employeeId: "employee_1",
        tableId: "table_occupied",
        status: "MAINTENANCE"
      })
    ).rejects.toMatchObject({
      code: "INVALID_STATUS_TRANSITION"
    } satisfies Partial<DomainError>);
  });
});
