import { describe, expect, it } from "vitest";
import { getHqMasterDashboardData } from "@/server/services/hq-analytics-service";

describe("HQ Analytics Service", () => {
  it("fetches aggregated multi-store metrics for a Franchise Organization", async () => {
    // Uses seeded "org-blackball-franchise"
    const data = await getHqMasterDashboardData("org-blackball-franchise");

    expect(data.organizationId).toBe("org-blackball-franchise");
    expect(data.organizationName).toBe("BlackBall Franchise Group");
    expect(data.totalOutlets).toBe(3);
    expect(data.outletSummaries).toHaveLength(3);
    expect(data.peakHoursBreakdown).toHaveLength(24);
  });
});
