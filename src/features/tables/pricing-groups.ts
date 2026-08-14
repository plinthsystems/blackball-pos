import type { BookableGameType } from "./types";

export const GAME_TYPE_LABELS: Record<BookableGameType, string> = {
  POOL: "Pool Table",
  SNOOKER: "Snooker Table",
  PS5: "PS5 Console"
};

const GAME_TYPE_ICONS: Record<BookableGameType, string> = {
  POOL: "sports_basketball",
  SNOOKER: "sports_tennis",
  PS5: "sports_esports"
};

export function gameTypeIcon(gameType: BookableGameType) {
  return GAME_TYPE_ICONS[gameType] ?? "sports";
}

const PRICING_GROUPS_BY_TYPE: Record<BookableGameType, string[]> = {
  POOL: ["standard"],
  SNOOKER: ["royal", "mini", "standard"],
  PS5: ["players-1", "players-2", "players-3", "players-4"]
};

const PRICING_GROUP_LABELS: Record<string, string> = {
  standard: "Standard",
  royal: "Royal",
  mini: "Mini",
  "players-1": "1 player",
  "players-2": "2 players",
  "players-3": "3 players",
  "players-4": "4 players"
};

export function pricingGroupOptions(gameType: BookableGameType): string[] {
  return PRICING_GROUPS_BY_TYPE[gameType] ?? ["standard"];
}

export function pricingGroupLabel(pricingGroup: string) {
  return PRICING_GROUP_LABELS[pricingGroup] ?? pricingGroup;
}

export const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  OCCUPIED: "Occupied",
  CLEANING: "Cleaning",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Blocked"
};

const DEFAULT_HOURLY_RATES: Record<string, number> = {
  "POOL:standard": 180,
  "SNOOKER:royal": 350,
  "SNOOKER:mini": 330,
  "SNOOKER:standard": 300,
  "PS5:players-1": 100,
  "PS5:players-2": 150,
  "PS5:players-3": 200,
  "PS5:players-4": 250,
  "PS5:standard": 150
};

export function defaultHourlyRateFor(gameType: BookableGameType, pricingGroup: string) {
  return DEFAULT_HOURLY_RATES[`${gameType}:${pricingGroup}`] ?? 0;
}
