import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generatePresignedUploadUrl, generateObjectKey } from "@/lib/storage";
import { z } from "zod";

const PresignUploadSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  contentType: z.string().optional(),
  contentLength: z.number().positive().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if 2FA is required and verified
    if (user.twoFactorEnabled && !user.twoFactorVerified) {
      return NextResponse.json({ error: "2FA verification required" }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = PresignUploadSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { filename, contentType, contentLength } = parsed.data;

    // Generate unique object key
    const objectKey = generateObjectKey(user.id, filename);

    // Generate presigned upload URL
    const { uploadUrl } = await generatePresignedUploadUrl(
      objectKey,
      contentType,
      contentLength
    );

    return NextResponse.json({
      uploadUrl,
      objectKey,
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    console.error("[/api/files/presign-upload] error:", error);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}