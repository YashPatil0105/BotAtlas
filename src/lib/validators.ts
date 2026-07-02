import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(4, "Password required"),
});

export const botCreateSchema = z.object({
  name: z.string().min(1, "Bot name is required"),
  vendor: z.string().optional().nullable(),
  technology: z.enum(["PAD", "POWER_AUTOMATE_CLOUD", "UI_PATH", "BLUE_PRISM", "AUTOMATION_ANYWHERE", "OTHER"]).default("PAD"),
  department: z.string().optional().nullable(),
  currentStatus: z.enum(["UNKNOWN", "ACTIVE", "FAILED", "INACTIVE", "OBSOLETE", "RETIRED"]).default("UNKNOWN"),
  criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  environment: z.enum(["DEFAULT", "DEV", "UAT", "PROD", "UNKNOWN"]).default("UNKNOWN"),
  businessPurpose: z.string().optional().nullable(),
  businessProcess: z.string().optional().nullable(),
  businessOwner: z.string().optional().nullable(),
  technicalOwner: z.string().optional().nullable(),
  scheduleOrTrigger: z.string().optional().nullable(),
  reviewSummary: z.string().optional().nullable(),
  finalRecommendation: z.enum(["RESTORE", "REFACTOR", "REBUILD", "REPLACE", "RETIRE", "HOLD"]).optional().nullable(),
  reviewStatus: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "AWAITING_VALIDATION"]).optional(),
  
  // Bot Registry Additional Fields
  srNo: z.number().int().optional().nullable(),
  projectName: z.string().optional().nullable(),
  partner: z.string().optional().nullable(),
  departmentSpoc: z.string().optional().nullable(),
  vendorSpoc: z.string().optional().nullable(),
  unitySpoc: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  cabDate: z.string().optional().nullable(),
  nextSteps: z.string().optional().nullable(),
  effortsInDays: z.number().optional().nullable(),
  roi: z.string().optional().nullable(),
  oldBotsNewBots: z.string().optional().nullable(),
  vendorPaymentStatus: z.string().optional().nullable(),
  botAssociated: z.string().optional().nullable(),
  botFrequency: z.string().optional().nullable(),
  processId: z.string().optional().nullable(),
  server: z.string().optional().nullable(),
  botExecutionUserId: z.string().optional().nullable(),
  docsLinks: z.string().optional().nullable(),
  docsUploaded: z.boolean().optional().default(false),
});

export const botStepSchema = z.object({
  stepOrder: z.number().int().min(1),
  actionType: z.string(),
  description: z.string().min(1, "Description is required"),
  systemName: z.string().optional(),
  systemType: z.string().optional(),
  moduleName: z.string().optional(),
  inputType: z.string().optional(),
  outputType: z.string().optional(),
  validationType: z.string().optional(),
  retryStrategy: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const dependencySchema = z.object({
  dependencyType: z.string(),
  name: z.string().min(1, "Name is required"),
  ownerTeam: z.string().optional(),
  criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  accessConfirmed: z.boolean().default(false),
  notes: z.string().optional(),
});

export const findingSchema = z.object({
  category: z.string(),
  observation: z.string().min(1, "Observation is required"),
  evidence: z.string().optional(),
  impact: z.string().optional(),
  recommendation: z.string().optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  status: z.enum(["OPEN", "IN_PROGRESS", "BLOCKED", "CLOSED"]).default("OPEN"),
  owner: z.string().optional(),
  dueDate: z.string().optional(),
});

export const rootCauseSchema = z.object({
  failurePoint: z.string().min(1, "Failure point is required"),
  category: z.string(),
  probableCause: z.string().optional(),
  evidence: z.string().optional(),
  confirmed: z.boolean().default(false),
  recoveryAction: z.string().optional(),
});

export const remediationSchema = z.object({
  findingId: z.string().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  owner: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "BLOCKED", "CLOSED"]).default("OPEN"),
  targetDate: z.string().optional(),
});

export const checklistSchema = z.object({
  checklistItem: z.string(),
  value: z.enum(["YES", "NO", "NOT_VERIFIED", "NA"]),
  notes: z.string().optional(),
});

export const componentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  componentType: z.string().min(1),
  description: z.string().optional(),
  canonicalSignature: z.string().optional(),
  sourceBotId: z.string().optional().nullable(),
  owner: z.string().optional(),
  status: z.enum(["CANDIDATE", "APPROVED", "NEEDS_REFACTOR", "DEPRECATED"]).default("CANDIDATE"),
  tags: z.array(z.string()).optional(),
  knownLimitations: z.string().optional(),
});

export type BotCreateInput = z.infer<typeof botCreateSchema>;
export type BotStepInput = z.infer<typeof botStepSchema>;
export type DependencyInput = z.infer<typeof dependencySchema>;
export type FindingInput = z.infer<typeof findingSchema>;
export type RootCauseInput = z.infer<typeof rootCauseSchema>;
export type RemediationInput = z.infer<typeof remediationSchema>;
export type ChecklistInput = z.infer<typeof checklistSchema>;
export type ComponentInput = z.infer<typeof componentSchema>;
