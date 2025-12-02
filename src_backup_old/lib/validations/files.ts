import { z } from "zod";

export const FileUploadSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  mimeType: z.string().optional(),
  size: z.number().positive("File size must be positive"),
  encFileKey: z.string().min(1, "Encrypted file key is required"),
  iv: z.string().min(1, "IV is required"),
  filenameCipher: z.string().min(1, "Encrypted filename is required"),
  notesCipher: z.string().optional(),
});

export const FileShareSchema = z.object({
  fileId: z.string().cuid("Invalid file ID"),
  granteeEmail: z.string().email("Valid email required"),
  expiresAt: z.string().datetime().optional(),
});

export const FileDownloadSchema = z.object({
  fileId: z.string().cuid("Invalid file ID"),
});

export const ShareRevokeSchema = z.object({
  shareId: z.string().cuid("Invalid share ID"),
});

export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export type FileShareInput = z.infer<typeof FileShareSchema>;
export type FileDownloadInput = z.infer<typeof FileDownloadSchema>;
export type ShareRevokeInput = z.infer<typeof ShareRevokeSchema>;