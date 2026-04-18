import { z } from "zod";

export const taskCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).default("TODO"),
  type: z.enum(["ONE_TIME", "RECURRING"]).default("ONE_TIME"),
  isPersonal: z.boolean().default(false),
  restrictStatusUpdates: z.boolean().default(false),
  dueDate: z.string().min(1, "Due date is required"),
  startDate: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).default([]),
  labelIds: z.array(z.string()).default([]),
  
  // Recurring fields
  frequency: z.enum(["DAILY", "WEEKDAY", "WEEKLY", "MONTHLY", "INTERVAL"]).optional(),
  interval: z.number().min(1).default(1).optional(),
  leadTime: z.number().min(0).default(0).optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  type: z.enum(["ONE_TIME", "RECURRING"]).optional(),
  isPersonal: z.boolean().optional(),
  restrictStatusUpdates: z.boolean().optional(),
  dueDate: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  labelIds: z.array(z.string()).optional(),
  frequency: z.enum(["DAILY", "WEEKDAY", "WEEKLY", "MONTHLY", "INTERVAL"]).optional().nullable(),
  interval: z.number().min(1).optional().nullable(),
  leadTime: z.number().min(0).optional().nullable(),
  position: z.number().optional(),
  completedAt: z.string().datetime().optional().nullable(),
});

export const teamCreateSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});

export const teamUpdateSchema = teamCreateSchema.partial();

export const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "MANAGER", "MEMBER"]).default("MEMBER"),
});

export const commentCreateSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty"),
});

export const labelCreateSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
  teamId: z.string().optional().nullable(),
});

export const onboardingSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  teamName: z.string().max(100).optional(),
  teamAction: z.enum(["create", "skip"]).default("skip"),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TeamCreateInput = z.infer<typeof teamCreateSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type LabelCreateInput = z.infer<typeof labelCreateSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
