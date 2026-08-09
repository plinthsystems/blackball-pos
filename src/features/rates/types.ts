export type RateGameType = "POOL" | "SNOOKER" | "PS5";

export type RateSetting = {
  id: string;
  label: "Royal Snooker" | "Mini Snooker" | "Pool" | "PS5 · 1 player" | "PS5 · 2 players" | "PS5 · 3 players" | "PS5 · 4 players";
  gameType: RateGameType;
  pricingGroup: string;
  hourlyRate: number;
};
