import { z } from "zod";

export const startWalkInSessionSchema = z.object({
  tableId: z.string().min(1),
  durationMinutes: z.union([z.literal(30), z.literal(60)], {
    invalid_type_error: "Choose a duration.",
    required_error: "Choose a duration."
  }),
  ps5MemberCount: z.coerce.number().int().min(1).max(4).optional(),
  customerName: z.string().trim().min(1).max(120).optional().or(z.literal("")),
  customerPhone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  assignedEmployeeId: z.string().min(1).optional()
});

export const extendSessionSchema = z.object({
  sessionId: z.string().min(1),
  addedMinutes: z.union([z.literal(30), z.literal(60)])
});

export const endSessionSchema = z.object({
  sessionId: z.string().min(1)
});

export const addBillItemSchema = z.object({
  billId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99)
});

export const removeBillItemSchema = z.object({
  billItemId: z.string().min(1)
});

export const closeCounterBillSchema = z.object({
  billId: z.string().min(1)
});

export const closeBillAndContinueSessionSchema = z.object({
  sessionId: z.string().min(1)
});

export const startCounterBillSchema = z.object({
  label: z.string().trim().max(120).optional().or(z.literal(""))
});

export const productFormSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(120),
  category: z.enum(["FOOD", "CIGARETTES", "BEVERAGES"]),
  priceAmount: z.coerce.number().min(0).max(999999),
  stockUnit: z.string().trim().min(1).max(24).optional(),
  unitsPerPack: z.coerce.number().int().min(1).max(9999).optional()
});

export const restockProductSchema = z.object({
  id: z.string().min(1),
  packs: z.coerce.number().int().min(1).max(9999)
});

export const inventoryProductSettingsSchema = z.object({
  id: z.string().min(1),
  stockUnit: z.string().trim().min(1).max(24),
  unitsPerPack: z.coerce.number().int().min(1).max(9999)
});

export const inventoryImportSchema = z.array(z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(["FOOD", "CIGARETTES", "BEVERAGES"]),
  priceAmount: z.coerce.number().min(0).max(999999),
  stockUnit: z.string().trim().min(1).max(24),
  unitsPerPack: z.coerce.number().int().min(1).max(9999),
  stockOnHand: z.coerce.number().int().min(0).max(9999999)
})).min(1).max(1000).superRefine((rows, context) => {
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const key = `${row.category}:${row.name.toLocaleLowerCase()}`;
    if (seen.has(key)) {
      context.addIssue({ code: "custom", path: [index, "name"], message: "Duplicate item name and category." });
    }
    seen.add(key);
  });
});

export const rateFormSchema = z.object({
  id: z.string().min(1),
  hourlyRate: z.coerce.number().min(0).max(999999)
});

export const brandingFormSchema = z.object({
  appName: z.string().trim().min(1).max(80),
  logoInitials: z.string().trim().min(1).max(4).transform((value) => value.toUpperCase()),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export const tableStatusSchema = z.object({
  tableId: z.string().min(1),
  status: z.enum(["AVAILABLE", "RESERVED", "CLEANING", "MAINTENANCE", "BLOCKED"])
});

export const bookableItemFormSchema = z.object({
  id: z.string().min(1).optional(),
  number: z.string().trim().min(1).max(80),
  gameType: z.enum(["POOL", "SNOOKER", "PS5"]),
  pricingGroup: z.string().trim().min(1).max(40)
});

export const bookableItemIdSchema = z.object({
  id: z.string().min(1)
});

export type StartWalkInSessionInput = z.infer<typeof startWalkInSessionSchema>;
export type ExtendSessionInput = z.infer<typeof extendSessionSchema>;
export type EndSessionInput = z.infer<typeof endSessionSchema>;
export type AddBillItemInput = z.infer<typeof addBillItemSchema>;
export type TableStatusInput = z.infer<typeof tableStatusSchema>;
