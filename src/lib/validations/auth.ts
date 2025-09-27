import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["PATIENT", "PROVIDER"]).optional().default("PATIENT"),
});

export const LoginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
  totpCode: z.string().length(6, "TOTP code must be 6 digits").optional(),
});

export const TotpEnrollSchema = z.object({
  totpCode: z.string().length(6, "TOTP code must be 6 digits"),
});

export const TotpVerifySchema = z.object({
  totpCode: z.string().length(6, "TOTP code must be 6 digits"),
});

export const RoleUpdateSchema = z.object({
  role: z.enum(["PATIENT", "PROVIDER", "ADMIN"]),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type TotpEnrollInput = z.infer<typeof TotpEnrollSchema>;
export type TotpVerifyInput = z.infer<typeof TotpVerifySchema>;
export type RoleUpdateInput = z.infer<typeof RoleUpdateSchema>;