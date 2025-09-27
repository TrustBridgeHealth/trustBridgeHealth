-- CreateEnum
CREATE TYPE "public"."SharePermission" AS ENUM ('READ');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'TWOFA_ENROLL', 'TWOFA_VERIFY', 'FILE_UPLOAD', 'FILE_DOWNLOAD', 'FILE_SHARE', 'FILE_SHARE_REVOKE', 'ROLE_CHANGE', 'ADMIN_PROMOTE', 'ADMIN_DEMOTE');

-- CreateEnum
CREATE TYPE "public"."AuditTarget" AS ENUM ('USER', 'FILE', 'SHARE', 'SYSTEM');

-- AlterTable
ALTER TABLE "public"."VerificationToken" ADD CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier", "token");

-- DropIndex
DROP INDEX "public"."VerificationToken_identifier_token_key";

-- CreateTable
CREATE TABLE "public"."File" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "mimeType" TEXT,
    "etag" TEXT,
    "sha256" TEXT,
    "encFileKey" BYTEA NOT NULL,
    "encFileKeyAlg" TEXT,
    "iv" BYTEA NOT NULL,
    "filenameCipher" TEXT NOT NULL,
    "notesCipher" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Share" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "granteeId" TEXT NOT NULL,
    "createdById" TEXT,
    "revokedById" TEXT,
    "permission" "public"."SharePermission" NOT NULL DEFAULT 'READ',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "action" "public"."AuditAction" NOT NULL,
    "target" "public"."AuditTarget" NOT NULL,
    "targetId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "fileId" TEXT,
    "shareId" TEXT,
    "subjectUserId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "File_ownerId_idx" ON "public"."File"("ownerId");

-- CreateIndex
CREATE INDEX "File_createdAt_idx" ON "public"."File"("createdAt");

-- CreateIndex
CREATE INDEX "File_ownerId_isDeleted_createdAt_idx" ON "public"."File"("ownerId", "isDeleted", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "File_bucket_objectKey_key" ON "public"."File"("bucket", "objectKey");

-- CreateIndex
CREATE INDEX "Share_granteeId_idx" ON "public"."Share"("granteeId");

-- CreateIndex
CREATE INDEX "Share_granteeId_revokedAt_idx" ON "public"."Share"("granteeId", "revokedAt");

-- CreateIndex
CREATE INDEX "Share_fileId_expiresAt_revokedAt_idx" ON "public"."Share"("fileId", "expiresAt", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Share_fileId_granteeId_key" ON "public"."Share"("fileId", "granteeId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_timestamp_idx" ON "public"."AuditLog"("actorId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_timestamp_idx" ON "public"."AuditLog"("action", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_target_targetId_idx" ON "public"."AuditLog"("target", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_fileId_timestamp_idx" ON "public"."AuditLog"("fileId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_shareId_timestamp_idx" ON "public"."AuditLog"("shareId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_subjectUserId_timestamp_idx" ON "public"."AuditLog"("subjectUserId", "timestamp");

-- AddForeignKey
ALTER TABLE "public"."File" ADD CONSTRAINT "File_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Share" ADD CONSTRAINT "Share_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Share" ADD CONSTRAINT "Share_granteeId_fkey" FOREIGN KEY ("granteeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Share" ADD CONSTRAINT "Share_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Share" ADD CONSTRAINT "Share_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "public"."Share"("id") ON DELETE SET NULL ON UPDATE CASCADE;
