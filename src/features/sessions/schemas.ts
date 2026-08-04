import { z } from "zod";

export const startWalkInSessionSchema = z.object({
  tableId: z.string().min(1),
  durationMinutes: z.union([z.literal(30), z.literal(60)], {
    invalid_type_error: "Choose a duration.",
    required_error: "Choose a duration."
  }),
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
  priceAmount: z.coerce.number().min(0).max(999999)
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
  status: z.literal("AVAILABLE")
});

export type StartWalkInSessionInput = z.infer<typeof startWalkInSessionSchema>;
export type ExtendSessionInput = z.infer<typeof extendSessionSchema>;
export type EndSessionInput = z.infer<typeof endSessionSchema>;
export type AddBillItemInput = z.infer<typeof addBillItemSchema>;
export type TableStatusInput = z.infer<typeof tableStatusSchema>;
