import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBackupJobStatus } from '@/lib/queue/backup-jobs';
import { createErrorResponse } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      const err = createErrorResponse('AUTH_REQUIRED');
      return NextResponse.json(err.error, { status: err.status });
    }

    const { jobId } = await params;

    // Validate jobId format (accepts cuids, UUIDs, numeric IDs)
    if (!/^[a-zA-Z0-9_-]+$/.test(jobId)) {
      const err = createErrorResponse('INVALID_INPUT', 'Invalid job ID format');
      return NextResponse.json(err.error, { status: err.status });
    }

    const status = await getBackupJobStatus(jobId);

    if (!status) {
      const err = createErrorResponse('BACKUP_NOT_FOUND');
      return NextResponse.json(err.error, { status: err.status });
    }

    // Verify job belongs to user
    if (status.userId !== session.user.id) {
      const err = createErrorResponse('AUTH_REQUIRED');
      return NextResponse.json(err.error, { status: err.status });
    }

    return NextResponse.json(status);

  } catch (error) {
    console.error('Status check error:', error);
    const err = createErrorResponse('INTERNAL_ERROR');
    return NextResponse.json(err.error, { status: err.status });
  }
}
