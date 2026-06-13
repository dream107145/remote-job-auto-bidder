import { z } from "zod";

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character");

export const signUpSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
    fullName: z.string().min(2, "Name must be at least 2 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  bio: z.string().max(2000, "Bio must be under 2000 characters").optional(),
  skills: z.array(z.string()).min(1, "At least one skill is required"),
  githubUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  availability: z.string().optional(),
  salaryMin: z.number().min(0).optional(),
  salaryMax: z.number().min(0).optional(),
  coverLetterTemplate: z.string().max(5000).optional(),
});

export const autoBidSettingsSchema = z.object({
  profileId: z.string().uuid("Select a profile"),
  isEnabled: z.boolean(),
  minSalary: z.number().min(0).optional(),
  maxSalary: z.number().min(0).optional(),
  jobTypes: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  excludedCompanies: z.array(z.string()).optional(),
  dailyBidLimit: z.number().min(1).max(100),
});

export const bidFilterSchema = z.object({
  status: z.enum(["pending", "submitted", "interview", "rejected", "accepted", "all"]).optional(),
  bidType: z.enum(["all", "manual", "auto"]).optional(),
  profileId: z.string().uuid().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().min(1),
  pageSize: z.number().min(1).max(100),
  sortBy: z.enum(["created_at", "job_title", "company", "status"]),
  sortOrder: z.enum(["asc", "desc"]),
});

export const jobSourceSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  apiUrl: z.string().url(),
  apiKey: z.string().optional(),
  status: z.enum(["active", "inactive", "error"]).default("active"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type AutoBidSettingsInput = z.infer<typeof autoBidSettingsSchema>;
export type BidFilterInput = z.infer<typeof bidFilterSchema>;
export type JobSourceInput = z.infer<typeof jobSourceSchema>;
