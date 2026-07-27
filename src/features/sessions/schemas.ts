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

export const tableStatusSchema = z.object({
  tableId: z.string().min(1),
  status: z.enum(["AVAILABLE", "CLEANING", "MAINTENANCE", "BLOCKED"])
});

export type StartWalkInSessionInput = z.infer<typeof startWalkInSessionSchema>;
export type ExtendSessionInput = z.infer<typeof extendSessionSchema>;
export type EndSessionInput = z.infer<typeof endSessionSchema>;
export type TableStatusInput = z.infer<typeof tableStatusSchema>;
