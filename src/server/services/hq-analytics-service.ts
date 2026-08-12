import { prisma } from "@/server/db/prisma";

export type OutletPerformanceSummary = {
  businessId: string;
  businessName: string;
  slug: string;
  activeTablesCount: number;
  totalTablesCount: number;
  todaySales: number;
  todaySessionCount: number;
  occupancyPercentage: number;
};

export type HqMasterDashboardData = {
  organizationId: string;
  organizationName: string;
  totalOutlets: number;
  totalSalesToday: number;
  totalActiveTablesNow: number;
  totalTablesAcrossOutlets: number;
  overallOccupancyPercentage: number;
  outletSummaries: OutletPerformanceSummary[];
  peakHoursBreakdown: Array<{ hourLabel: string; sessionCount: number; revenue: number }>;
};

export async function getHqMasterDashboardData(organizationId: string): Promise<HqMasterDashboardData> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      businesses: {
        include: {
          tables: { select: { id: true, status: true } }
        }
      }
    }
  });

  if (!organization) {
    throw new Error(`Organization with ID ${organizationId} not found`);
  }

  const businessIds = organization.businesses.map((b) => b.id);

  // Today's start and end boundaries
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch all closed/open bills for today across all outlets in this org
  const billsToday = await prisma.bill.findMany({
    where: {
      businessId: { in: businessIds },
      openedAt: { gte: startOfDay, lte: endOfDay }
    },
    select: {
      businessId: true,
      totalAmountSnapshot: true,
      openedAt: true,
      sessionId: true
    }
  });

  // Fetch active sessions today
  const sessionsToday = await prisma.session.findMany({
    where: {
      businessId: { in: businessIds },
      startedAt: { gte: startOfDay, lte: endOfDay }
    },
    select: {
      businessId: true,
      startedAt: true,
      status: true
    }
  });

  // Compute metrics per outlet
  const outletSummaries: OutletPerformanceSummary[] = organization.businesses.map((b) => {
    const totalTables = b.tables.length;
    const activeTables = b.tables.filter((t) => t.status === "OCCUPIED").length;

    const bBills = billsToday.filter((bill) => bill.businessId === b.id);
    const todaySales = bBills.reduce((acc, bill) => acc + Number(bill.totalAmountSnapshot), 0);

    const bSessions = sessionsToday.filter((s) => s.businessId === b.id);

    return {
      businessId: b.id,
      businessName: b.name,
      slug: b.slug,
      activeTablesCount: activeTables,
      totalTablesCount: totalTables,
      todaySales,
      todaySessionCount: bSessions.length,
      occupancyPercentage: totalTables > 0 ? Math.round((activeTables / totalTables) * 100) : 0
    };
  });

  const totalSalesToday = outletSummaries.reduce((acc, curr) => acc + curr.todaySales, 0);
  const totalActiveTablesNow = outletSummaries.reduce((acc, curr) => acc + curr.activeTablesCount, 0);
  const totalTablesAcrossOutlets = outletSummaries.reduce((acc, curr) => acc + curr.totalTablesCount, 0);

  const overallOccupancyPercentage =
    totalTablesAcrossOutlets > 0 ? Math.round((totalActiveTablesNow / totalTablesAcrossOutlets) * 100) : 0;

  // Peak hours analysis (24-hour distribution)
  const hourBuckets: Record<number, { sessionCount: number; revenue: number }> = {};
  for (let i = 0; i < 24; i++) {
    hourBuckets[i] = { sessionCount: 0, revenue: 0 };
  }

  sessionsToday.forEach((s) => {
    const hour = s.startedAt.getHours();
    hourBuckets[hour].sessionCount += 1;
  });

  billsToday.forEach((b) => {
    const hour = b.openedAt.getHours();
    hourBuckets[hour].revenue += Number(b.totalAmountSnapshot);
  });

  const peakHoursBreakdown = Object.entries(hourBuckets).map(([hour, val]) => {
    const h = parseInt(hour, 10);
    const label = `${h.toString().padStart(2, "0")}:00`;
    return {
      hourLabel: label,
      sessionCount: val.sessionCount,
      revenue: val.revenue
    };
  });

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    totalOutlets: organization.businesses.length,
    totalSalesToday,
    totalActiveTablesNow,
    totalTablesAcrossOutlets,
    overallOccupancyPercentage,
    outletSummaries,
    peakHoursBreakdown
  };
}
