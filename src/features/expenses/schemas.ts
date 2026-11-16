import { z } from "zod";

const expenseLineSchema = z.object({
  description: z.string().trim().min(1).max(120),
  amount: z.coerce.number().positive().max(9999999),
  productId: z.string().trim().min(1).optional(),
  packs: z.coerce.number().int().min(1).max(999999).optional()
}).superRefine((line, context) => {
  if (line.productId && !line.packs) {
    context.addIssue({ code: "custom", path: ["packs"], message: "Enter the number of packs to add to stock." });
  }
  if (!line.productId && line.packs !== undefined) {
    context.addIssue({ code: "custom", path: ["packs"], message: "Choose an inventory item before entering packs." });
  }
});

export const expenseFormSchema = z.object({
  category: z.enum(["INVENTORY_PURCHASE", "GROCERIES", "UTILITIES", "RENT", "MAINTENANCE", "OTHER"]),
  vendorName: z.string().trim().max(120).optional().or(z.literal("")),
  paymentMethod: z.enum(["CASH", "UPI"]),
  spentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z.array(expenseLineSchema).min(1).max(40)
}).superRefine((expense, context) => {
  const stockLine = expense.items.some((line) => Boolean(line.productId));
  if (expense.category === "INVENTORY_PURCHASE" && !stockLine) {
    context.addIssue({ code: "custom", path: ["items"], message: "Link at least one tracked item to record an inventory purchase." });
  }
  if (expense.category !== "INVENTORY_PURCHASE" && stockLine) {
    context.addIssue({ code: "custom", path: ["category"], message: "Tracked stock additions must use Inventory purchase." });
  }
  const [year, month, day] = expense.spentAt.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    context.addIssue({ code: "custom", path: ["spentAt"], message: "Enter a valid expense date." });
  }
});

export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;
