import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createErrorResponse } from '@/lib/errors';
import { createBackupJob } from '@/lib/queue/backup-jobs';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/ip';
import { PlatformType } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.accessToken) {
      const err = createErrorResponse('AUTH_REQUIRED');
      return NextResponse.json(err.error, { status: err.status });
    }

    const { jobId } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(jobId)) {
      const err = createErrorResponse('INVALID_INPUT', 'Invalid job ID format');
      return NextResponse.json(err.error, { status: err.status });
    }

    const originalJob = await prisma.backupJob.findUnique({
      where: { id: jobId },
    });

    if (!originalJob) {
      const err = createErrorResponse('BACKUP_NOT_FOUND');
      return NextResponse.json(err.error, { status: err.status });
    }

    if (originalJob.userId !== session.user.id) {
      const err = createErrorResponse('AUTH_REQUIRED');
      return NextResponse.json(err.error, { status: err.status });
    }

    if (originalJob.status !== 'failed') {
      const err = createErrorResponse('INVALID_INPUT', 'Only failed backups can be retried');
      return NextResponse.json(err.error, { status: err.status });
    }

    const newJobId = await createBackupJob({
      userId: session.user.id,
      platform: originalJob.platform as PlatformType,
      accessToken: session.accessToken,
      dataTypes: originalJob.dataTypes,
      provider: session.provider || originalJob.platform,
      userEmail: session.user.email || undefined,
    });

    await logAudit({
      userId: session.user.id,
      action: 'backup.retried',
      platform: originalJob.platform,
      metadata: { originalJobId: jobId, newJobId },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      jobId: newJobId,
      message: 'Backup retry started',
    });
  } catch (error) {
    console.error('Backup retry error:', error);
    const err = createErrorResponse('BACKUP_START_FAILED');
    return NextResponse.json(err.error, { status: err.status });
  }
}
