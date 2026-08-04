export type RateGameType = "POOL" | "SNOOKER" | "PS5";

export type RateSetting = {
  id: string;
  label: "Royal Snooker" | "Mini Snooker" | "Pool" | "PS5";
  gameType: RateGameType;
  pricingGroup: string;
  hourlyRate: number;
};
