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
