export type TableStatusName = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "BLOCKED";

const allowedTransitions: Record<TableStatusName, TableStatusName[]> = {
  AVAILABLE: ["CLEANING", "MAINTENANCE", "BLOCKED"],
  RESERVED: ["AVAILABLE", "OCCUPIED", "BLOCKED"],
  OCCUPIED: ["CLEANING"],
  CLEANING: ["AVAILABLE", "MAINTENANCE", "BLOCKED"],
  MAINTENANCE: ["AVAILABLE", "BLOCKED"],
  BLOCKED: ["AVAILABLE", "MAINTENANCE"]
};

export function canTransitionTableStatus(from: TableStatusName, to: TableStatusName) {
  return allowedTransitions[from].includes(to);
}

/**
 * Manual override rules for staff: fix a table that drifted from reality
 * (e.g. shows OCCUPIED but has no session, or needs maintenance).
 * - OCCUPIED can never be set manually — it only comes from a real session start.
 * - Any manual change is refused while a real ACTIVE session exists on the table
 *   (that state must go through the proper end-session flow).
 */
export function canManuallySetStatus(
  from: TableStatusName,
  to: TableStatusName,
  hasActiveSession: boolean
): boolean {
  if (to === "OCCUPIED") {
    return false;
  }
  if (hasActiveSession) {
    return false;
  }
  return from !== to;
}
