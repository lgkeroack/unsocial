import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export type AuditAction =
  | 'backup.started'
  | 'backup.completed'
  | 'backup.failed'
  | 'backup.retried'
  | 'archive.downloaded'
  | 'archive.email_resent'
  | 'admin.accessed';

interface AuditParams {
  userId?: string | null;
  action: AuditAction;
  platform?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        platform: params.platform,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    // Fire-and-forget: never break the main flow
    console.error('Audit log failed:', error);
  }
}
