import { describe, expect, it } from "vitest";
import { inventoryCsvSample, parseInventoryCsv } from "@/features/inventory/csv";

const headers = "name,category,priceAmount,stockUnit,unitsPerPack,stockOnHand";

describe("parseInventoryCsv", () => {
  it("parses stock counts in individual units and supports quoted item names", () => {
    const rows = parseInventoryCsv(`${headers}\n"Compact, Mild",CIGARETTES,15,stick,10,80\nWater,BEVERAGES,20,bottle,12,36`);

    expect(rows).toEqual([
      { name: "Compact, Mild", category: "CIGARETTES", priceAmount: 15, stockUnit: "stick", unitsPerPack: 10, stockOnHand: 80 },
      { name: "Water", category: "BEVERAGES", priceAmount: 20, stockUnit: "bottle", unitsPerPack: 12, stockOnHand: 36 }
    ]);
  });

  it("rejects missing headers and invalid quantities", () => {
    expect(() => parseInventoryCsv("name,price\nTea,20")).toThrow("CSV headers must be");
    expect(() => parseInventoryCsv(`${headers}\nTea,FOOD,20,portion,1,-1`)).toThrow("stockOnHand must be");
  });

  it("rejects duplicate product names within a category", () => {
    expect(() => parseInventoryCsv(`${headers}\nTea,FOOD,20,portion,1,10\ntea,FOOD,22,portion,1,8`)).toThrow("Duplicate item in CSV");
  });

  it("includes a usable sample with both 10-stick and 15-stick packs", () => {
    const rows = parseInventoryCsv(inventoryCsvSample);
    expect(rows[0]?.unitsPerPack).toBe(10);
    expect(rows[1]?.unitsPerPack).toBe(15);
    expect(rows[2]?.stockUnit).toBe("bottle");
  });
});
