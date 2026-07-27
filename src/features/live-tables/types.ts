export type LiveTableStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "BLOCKED";
export type LiveTableGameType = "POOL" | "SNOOKER";
export type LiveSessionStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";

export type LiveTableCardData = {
  id: string;
  number: string;
  gameType: LiveTableGameType;
  status: LiveTableStatus;
  currentSession: null | {
    id: string;
    status: LiveSessionStatus;
    customerName: string | null;
    startedAt: string;
    plannedEndAt: string;
    billEstimate: number;
    assignedStaffName: string | null;
  };
};
