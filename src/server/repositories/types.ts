import type { GameType, SessionStatus, TableStatus } from "@prisma/client";

export type TransactionClient = unknown;

export type TableRecord = {
  id: string;
  businessId: string;
  number: string;
  gameType: GameType;
  status: TableStatus;
  pricingGroup: string;
};

export type SessionRecord = {
  id: string;
  businessId: string;
  tableId: string;
  status: SessionStatus;
  startedAt: Date;
  plannedEndAt: Date;
  ps5MemberCount: number | null;
  hourlyRateSnapshot: number;
};

export type ConflictRecord = {
  id: string;
  kind: "booking" | "session";
  startsAt: Date;
  endsAt: Date;
};

export type PricingRule = {
  durationMinutes: number;
  priceAmount: number;
};

export type LiveTableRecord = TableRecord & {
  currentSession: null | {
    id: string;
    status: SessionStatus;
    customerName: string | null;
    plannedEndAt: Date;
    billEstimate: number;
    assignedStaffName: string | null;
  };
};
