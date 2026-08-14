export type BookableGameType = "POOL" | "SNOOKER" | "PS5";

export type BookableItemStatus = "AVAILABLE" | "RESERVED" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "BLOCKED";

export type BookableItem = {
  id: string;
  number: string;
  gameType: BookableGameType;
  pricingGroup: string;
  status: BookableItemStatus;
  active: boolean;
  hourlyRate: number;
};
