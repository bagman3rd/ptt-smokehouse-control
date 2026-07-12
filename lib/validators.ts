import { z } from 'zod';

export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.');
export const roleSchema = z.enum(['ADMIN', 'OWNER', 'KITCHEN_MANAGER', 'KITCHEN_CREW']);

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(120).transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(240),
  otp: z.string().trim().max(12).optional().default('')
});

export const signupSchema = z.object({
  restaurantName: z.string().trim().min(2).max(120),
  city: z.string().trim().max(80).optional().default(''),
  state: z.string().trim().max(40).optional().default(''),
  timezone: z.string().trim().min(3).max(80).default('America/New_York'),
  ownerName: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/, 'Username can use letters, numbers, dot, underscore, and dash.').transform((v) => v.toLowerCase()),
  email: z.string().trim().email().max(160).transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(240)
});

export const cookPlanSchema = z.object({
  serviceDate: dateOnlySchema,
  scenarioId: z.string().trim().optional().default(''),
  eventMultiplier: z.coerce.number().min(0.5).max(5).default(1),
  dayPatternKey: z.string().trim().max(40).optional().default('')
});

export const eodProteinEntrySchema = z.object({
  proteinId: z.string().min(1),
  cookedUnits: z.coerce.number().min(0).default(0),
  soldCookedLb: z.coerce.number().min(0).default(0),
  usableLeftoverLb: z.coerce.number().min(0).default(0),
  usableLeftoverUnits: z.coerce.number().min(0).default(0),
  wasteLb: z.coerce.number().min(0).default(0),
  eightySixed: z.boolean().optional().default(false),
  wasteReason: z.string().max(240).optional().default('')
});

export const eodSchema = z.object({
  serviceDate: dateOnlySchema,
  totalSales: z.coerce.number().min(0).default(0),
  bbqSales: z.coerce.number().min(0).default(0),
  status: z.enum(['DRAFT', 'COMPLETE', 'REVIEWED', 'LOCKED']).default('DRAFT'),
  lockLog: z.boolean().optional().default(false),
  notes: z.string().max(1000).optional().default(''),
  proteins: z.array(eodProteinEntrySchema).default([])
});

export const savedReportSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).optional().default(''),
  source: z.string().trim().min(1).max(40),
  metric: z.string().trim().min(1).max(60),
  groupBy: z.string().trim().min(1).max(60),
  protein: z.string().trim().max(80).optional().default('all'),
  range: z.string().trim().max(40).optional().default('last30'),
  start: z.string().trim().max(20).optional().default(''),
  end: z.string().trim().max(20).optional().default('')
});
