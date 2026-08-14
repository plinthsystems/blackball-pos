import { describe, expect, it } from "vitest";
import { canTransitionTableStatus } from "@/server/domain/table-transitions";

describe("table status transitions", () => {
  it("allows operational statuses to return to available", () => {
    expect(canTransitionTableStatus("CLEANING", "AVAILABLE")).toBe(true);
    expect(canTransitionTableStatus("MAINTENANCE", "AVAILABLE")).toBe(true);
    expect(canTransitionTableStatus("BLOCKED", "AVAILABLE")).toBe(true);
  });

  it("prevents occupied tables from being moved directly to maintenance", () => {
    expect(canTransitionTableStatus("OCCUPIED", "MAINTENANCE")).toBe(false);
  });
});
