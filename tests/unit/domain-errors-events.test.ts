import { describe, expect, it } from "vitest";
import { DomainError } from "@/server/domain/errors";
import { noopDomainEventPublisher } from "@/server/domain/events";

describe("DomainError", () => {
  it("exposes code, message and metadata", () => {
    const error = new DomainError("UNAUTHORIZED", "Not allowed", { permission: "tables.manage" });
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error.name).toBe("DomainError");
    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.message).toBe("Not allowed");
    expect(error.metadata).toEqual({ permission: "tables.manage" });
  });

  it("defaults metadata to an empty object", () => {
    const error = new DomainError("SESSION_NOT_ACTIVE", "No active session");
    expect(error.metadata).toEqual({});
  });

  it("is catchable as an Error", () => {
    const error = new DomainError("PRICING_NOT_FOUND", "No pricing");
    expect(error instanceof Error).toBe(true);
    expect(error.stack).toBeDefined();
  });
});

describe("noopDomainEventPublisher", () => {
  it("publishes without throwing and records nothing", async () => {
    const event = {
      name: "session.started" as const,
      businessId: "biz-1",
      entityId: "session-1",
      payload: { tableNumber: "5" }
    };
    await expect(noopDomainEventPublisher.publish(event)).resolves.toBeUndefined();
  });

  it("is callable repeatedly", async () => {
    await noopDomainEventPublisher.publish({
      name: "table.status_changed",
      businessId: "biz-1",
      entityId: "table-1",
      payload: {}
    });
    await noopDomainEventPublisher.publish({
      name: "session.ended",
      businessId: "biz-1",
      entityId: "session-2",
      payload: {}
    });
    expect(true).toBe(true);
  });
});
