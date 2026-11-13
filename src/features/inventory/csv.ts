export type InventoryCsvRow = {
  name: string;
  category: "FOOD" | "CIGARETTES" | "BEVERAGES";
  priceAmount: number;
  stockUnit: string;
  unitsPerPack: number;
  stockOnHand: number;
};

export const inventoryCsvTemplate = "name,category,priceAmount,stockUnit,unitsPerPack,stockOnHand\n";
export const inventoryCsvSample = `${inventoryCsvTemplate}Compact,CIGARETTES,1,stick,10,100\nClassic,CIGARETTES,1,stick,15,75\nWater Bottle,BEVERAGES,20,bottle,12,36\n`;

const requiredHeaders = ["name", "category", "priceamount", "stockunit", "unitsperpack", "stockonhand"];

export function parseInventoryCsv(csv: string): InventoryCsvRow[] {
  const rows = parseCsvRows(csv).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (rows.length < 2) {
    throw new Error("CSV needs a header row and at least one item.");
  }

  const headers = rows[0].map((header) => header.trim().toLocaleLowerCase());
  const indexes = requiredHeaders.map((header) => headers.indexOf(header));
  if (indexes.some((index) => index < 0)) {
    throw new Error("CSV headers must be name, category, priceAmount, stockUnit, unitsPerPack, stockOnHand.");
  }

  const parsed = rows.slice(1).map((row, index): InventoryCsvRow => {
    const rowNumber = index + 2;
    const value = (column: number) => row[indexes[column]]?.trim() ?? "";
    const name = value(0);
    const category = value(1).toLocaleUpperCase();
    const stockUnit = value(3);
    const priceAmount = Number(value(2));
    const unitsPerPack = Number(value(4));
    const stockOnHand = Number(value(5));

    if (!name || !stockUnit) throw new Error(`Row ${rowNumber}: name and stockUnit are required.`);
    if (!["FOOD", "CIGARETTES", "BEVERAGES"].includes(category)) throw new Error(`Row ${rowNumber}: category must be FOOD, CIGARETTES, or BEVERAGES.`);
    if (!Number.isFinite(priceAmount) || priceAmount < 0) throw new Error(`Row ${rowNumber}: priceAmount must be zero or more.`);
    if (!Number.isInteger(unitsPerPack) || unitsPerPack < 1) throw new Error(`Row ${rowNumber}: unitsPerPack must be a positive whole number.`);
    if (!Number.isInteger(stockOnHand) || stockOnHand < 0) throw new Error(`Row ${rowNumber}: stockOnHand must be a non-negative whole number.`);

    return {
      name,
      category: category as InventoryCsvRow["category"],
      priceAmount,
      stockUnit,
      unitsPerPack,
      stockOnHand
    };
  });

  const seen = new Set<string>();
  for (const row of parsed) {
    const key = `${row.category}:${row.name.toLocaleLowerCase()}`;
    if (seen.has(key)) throw new Error(`Duplicate item in CSV: ${row.name}.`);
    seen.add(key);
  }
  return parsed;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quote.");
  row.push(cell);
  rows.push(row);
  return rows;
}
