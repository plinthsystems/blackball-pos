import { describe, expect, it } from "vitest";
import {
  GAME_TYPE_LABELS,
  gameTypeIcon,
  pricingGroupOptions,
  pricingGroupLabel,
  STATUS_LABELS,
  defaultHourlyRateFor
} from "@/features/tables/pricing-groups";
import type { BookableGameType } from "@/features/tables/types";

describe("GAME_TYPE_LABELS", () => {
  it("has labels for all game types", () => {
    expect(GAME_TYPE_LABELS.POOL).toBe("Pool Table");
    expect(GAME_TYPE_LABELS.SNOOKER).toBe("Snooker Table");
    expect(GAME_TYPE_LABELS.PS5).toBe("PS5 Console");
  });
});

describe("gameTypeIcon", () => {
  it("returns the correct icon for POOL", () => {
    expect(gameTypeIcon("POOL")).toBe("sports_basketball");
  });

  it("returns the correct icon for SNOOKER", () => {
    expect(gameTypeIcon("SNOOKER")).toBe("sports_tennis");
  });

  it("returns the correct icon for PS5", () => {
    expect(gameTypeIcon("PS5")).toBe("sports_esports");
  });

  it("returns 'sports' for unknown game type", () => {
    expect(gameTypeIcon("UNKNOWN" as BookableGameType)).toBe("sports");
  });
});

describe("pricingGroupOptions", () => {
  it("returns standard-only for POOL", () => {
    expect(pricingGroupOptions("POOL")).toEqual(["standard"]);
  });

  it("returns royal, mini, standard for SNOOKER", () => {
    expect(pricingGroupOptions("SNOOKER")).toEqual(["royal", "mini", "standard"]);
  });

  it("returns player-count groups for PS5", () => {
    expect(pricingGroupOptions("PS5")).toEqual(["players-1", "players-2", "players-3", "players-4"]);
  });

  it("returns ['standard'] for unknown game type", () => {
    expect(pricingGroupOptions("UNKNOWN" as BookableGameType)).toEqual(["standard"]);
  });
});

describe("pricingGroupLabel", () => {
  it("returns correct labels for known pricing groups", () => {
    expect(pricingGroupLabel("standard")).toBe("Standard");
    expect(pricingGroupLabel("royal")).toBe("Royal");
    expect(pricingGroupLabel("mini")).toBe("Mini");
    expect(pricingGroupLabel("players-1")).toBe("1 player");
    expect(pricingGroupLabel("players-2")).toBe("2 players");
    expect(pricingGroupLabel("players-3")).toBe("3 players");
    expect(pricingGroupLabel("players-4")).toBe("4 players");
  });

  it("returns the input as-is for unknown pricing groups", () => {
    expect(pricingGroupLabel("unknown-group")).toBe("unknown-group");
  });
});

describe("STATUS_LABELS", () => {
  it("has labels for all statuses", () => {
    expect(STATUS_LABELS.AVAILABLE).toBe("Available");
    expect(STATUS_LABELS.RESERVED).toBe("Reserved");
    expect(STATUS_LABELS.OCCUPIED).toBe("Occupied");
    expect(STATUS_LABELS.CLEANING).toBe("Cleaning");
    expect(STATUS_LABELS.MAINTENANCE).toBe("Maintenance");
    expect(STATUS_LABELS.BLOCKED).toBe("Blocked");
  });
});

describe("defaultHourlyRateFor", () => {
  it("returns correct rate for POOL standard", () => {
    expect(defaultHourlyRateFor("POOL", "standard")).toBe(180);
  });

  it("returns correct rate for SNOOKER royal", () => {
    expect(defaultHourlyRateFor("SNOOKER", "royal")).toBe(350);
  });

  it("returns correct rate for SNOOKER mini", () => {
    expect(defaultHourlyRateFor("SNOOKER", "mini")).toBe(330);
  });

  it("returns correct rate for SNOOKER standard", () => {
    expect(defaultHourlyRateFor("SNOOKER", "standard")).toBe(300);
  });

  it("returns correct rates for PS5 player counts", () => {
    expect(defaultHourlyRateFor("PS5", "players-1")).toBe(100);
    expect(defaultHourlyRateFor("PS5", "players-2")).toBe(150);
    expect(defaultHourlyRateFor("PS5", "players-3")).toBe(200);
    expect(defaultHourlyRateFor("PS5", "players-4")).toBe(250);
  });

  it("returns correct rate for PS5 standard", () => {
    expect(defaultHourlyRateFor("PS5", "standard")).toBe(150);
  });

  it("returns 0 for unknown game type and pricing group combination", () => {
    expect(defaultHourlyRateFor("POOL", "royal")).toBe(0);
    expect(defaultHourlyRateFor("UNKNOWN" as BookableGameType, "standard")).toBe(0);
  });

  it("returns 0 for unknown pricing group", () => {
    expect(defaultHourlyRateFor("POOL", "vip")).toBe(0);
  });
});