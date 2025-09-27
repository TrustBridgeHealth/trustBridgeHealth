import { prisma } from "@/lib/prisma";
import { AuditAction, AuditTarget } from "@prisma/client";

interface AuditLogInput {
  action: AuditAction;
  target: AuditTarget;
  actorId?: string;
  targetId?: string;
  fileId?: string;
  shareId?: string;
  subjectUserId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  static async log(input: AuditLogInput) {
    try {
      await prisma.auditLog.create({
        data: {
          action: input.action,
          target: input.target,
          actorId: input.actorId,
          targetId: input.targetId,
          fileId: input.fileId,
          shareId: input.shareId,
          subjectUserId: input.subjectUserId,
          ip: input.ip,
          userAgent: input.userAgent,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  static async logLogin(
    userId: string,
    success: boolean,
    ip?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ) {
    await this.log({
      action: success ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
      target: "USER",
      actorId: success ? userId : undefined,
      subjectUserId: userId,
      ip,
      userAgent,
      metadata,
    });
  }

  static async logTwoFactorEnroll(userId: string, ip?: string, userAgent?: string) {
    await this.log({
      action: "TWOFA_ENROLL",
      target: "USER",
      actorId: userId,
      subjectUserId: userId,
      ip,
      userAgent,
    });
  }

  static async logTwoFactorVerify(
    userId: string,
    success: boolean,
    ip?: string,
    userAgent?: string
  ) {
    await this.log({
      action: "TWOFA_VERIFY",
      target: "USER",
      actorId: success ? userId : undefined,
      subjectUserId: userId,
      ip,
      userAgent,
      metadata: { success },
    });
  }

  static async logFileUpload(
    userId: string,
    fileId: string,
    filename: string,
    size: number,
    ip?: string,
    userAgent?: string
  ) {
    await this.log({
      action: "FILE_UPLOAD",
      target: "FILE",
      actorId: userId,
      fileId,
      targetId: fileId,
      ip,
      userAgent,
      metadata: { filename, size },
    });
  }

  static async logFileDownload(
    userId: string,
    fileId: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.log({
      action: "FILE_DOWNLOAD",
      target: "FILE",
      actorId: userId,
      fileId,
      targetId: fileId,
      ip,
      userAgent,
    });
  }

  static async logFileShare(
    userId: string,
    fileId: string,
    shareId: string,
    granteeId: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.log({
      action: "FILE_SHARE",
      target: "SHARE",
      actorId: userId,
      fileId,
      shareId,
      targetId: shareId,
      subjectUserId: granteeId,
      ip,
      userAgent,
    });
  }

  static async logShareRevoke(
    userId: string,
    shareId: string,
    fileId: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.log({
      action: "FILE_SHARE_REVOKE",
      target: "SHARE",
      actorId: userId,
      shareId,
      fileId,
      targetId: shareId,
      ip,
      userAgent,
    });
  }

  static async logRoleChange(
    actorId: string,
    subjectUserId: string,
    oldRole: string,
    newRole: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.log({
      action: "ROLE_CHANGE",
      target: "USER",
      actorId,
      subjectUserId,
      targetId: subjectUserId,
      ip,
      userAgent,
      metadata: { oldRole, newRole },
    });
  }

  static async logAccountLock(
    subjectUserId: string,
    reason: string,
    ip?: string,
    userAgent?: string
  ) {
    await this.log({
      action: "ACCOUNT_LOCKED",
      target: "USER",
      subjectUserId,
      targetId: subjectUserId,
      ip,
      userAgent,
      metadata: { reason },
    });
  }
}

export { AuditLogger as auditLogger };

// Legacy function for backward compatibility
type AuditInput = {
  action: string;
  target: string;
  userId: string;
  fileId?: string;
  meta?: Record<string, any>;
};

// Rename the legacy export to avoid conflict
export function legacyAuditLogger(prisma: any) {
  return {
    async log(entry: AuditInput) {
      try {
        if (prisma?.auditLog?.create) {
          await prisma.auditLog.create({
            data: {
              action: entry.action,
              target: entry.target,
              userId: entry.userId,
              fileId: entry.fileId ?? null,
              meta: entry.meta ?? {},
            },
          });
        } else {
          console.info("[audit]", JSON.stringify(entry));
        }
      } catch (e) {
        console.warn("[audit:noop]", e);
      }
    },
  };
}