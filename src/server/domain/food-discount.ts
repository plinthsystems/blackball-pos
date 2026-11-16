export const FOOD_MENU_DISCOUNT_RATE = 0.2;
export const FOOD_MENU_DISCOUNT_LABEL = "Food menu discount (20%)";

type DiscountableBillItem = {
  nameSnapshot?: string;
  category: "FOOD" | "CAFE" | "CIGARETTES" | "BEVERAGES";
  lineTotalAmount: unknown;
};

export function calculateFoodMenuDiscount(items: DiscountableBillItem[]) {
  const eligibleSubtotal = items.reduce((total, item) => {
    if (item.nameSnapshot === FOOD_MENU_DISCOUNT_LABEL || (item.category !== "FOOD" && item.category !== "CAFE")) return total;
    return total + Math.max(0, Number(item.lineTotalAmount));
  }, 0);
  return Math.round(eligibleSubtotal * FOOD_MENU_DISCOUNT_RATE * 100) / 100;
}

export function getRecordedFoodMenuDiscount(items: DiscountableBillItem[]) {
  return Math.round(items.reduce((total, item) => {
    if (item.nameSnapshot !== FOOD_MENU_DISCOUNT_LABEL) return total;
    return total + Math.max(0, -Number(item.lineTotalAmount));
  }, 0) * 100) / 100;
}

export function foodMenuDiscountBillItem(businessId: string, billId: string, amount: number) {
  return {
    businessId,
    billId,
    productId: null,
    category: "FOOD" as const,
    nameSnapshot: FOOD_MENU_DISCOUNT_LABEL,
    unitPriceAmount: -amount,
    quantity: 1,
    lineTotalAmount: -amount
  };
}

export function isFoodMenuDiscountItem(item: { name: string } | { nameSnapshot: string }) {
  return ("name" in item ? item.name : item.nameSnapshot) === FOOD_MENU_DISCOUNT_LABEL;
}
