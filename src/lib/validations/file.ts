// src/lib/validation/file.ts
import { z } from "zod";

const safeStr = (label: string, max = 512) =>
  z
    .string({
      required_error: `${label} is required`,
      invalid_type_error: `${label} must be a string`,
    })
    .min(1, `${label} cannot be empty`)
    .max(max, `${label} is too long`);

const nonEmptyBase64OrHex = (label: string) =>
  z
    .string()
    .refine(
      (s) => /^[0-9a-fA-F]+$/.test(s) || /^[A-Za-z0-9+/=]+$/.test(s),
      { message: `${label} must be hex or base64` }
    );

export const PresignUploadSchema = z.object({
  mimeType: z.string().trim().max(255).optional(),
  size: z.number().int().positive("size must be > 0"),
  filenameCipher: safeStr("filenameCipher", 4096),
  notesCipher: z.string().trim().max(16_384).optional(),
  encFileKey: nonEmptyBase64OrHex("encFileKey"),
  encFileKeyAlg: z.string().trim().max(64).optional(),
  iv: nonEmptyBase64OrHex("iv"),
});

export type PresignUploadInput = z.infer<typeof PresignUploadSchema>;

export const PresignDownloadSchema = z.object({
  fileId: safeStr("fileId", 64),
});

export type PresignDownloadInput = z.infer<typeof PresignDownloadSchema>;
