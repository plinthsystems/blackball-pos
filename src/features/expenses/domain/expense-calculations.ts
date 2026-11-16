export function calculateExpenseStockUnits(packs: number, unitsPerPack: number) {
  if (!Number.isSafeInteger(packs) || packs < 1 || !Number.isSafeInteger(unitsPerPack) || unitsPerPack < 1) {
    throw new RangeError("Pack quantity and units per pack must be positive whole numbers.");
  }
  const units = packs * unitsPerPack;
  if (!Number.isSafeInteger(units) || units > 2_147_483_647) {
    throw new RangeError("The stock quantity is too large.");
  }
  return units;
}
