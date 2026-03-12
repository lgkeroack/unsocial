import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createErrorResponse } from '@/lib/errors';
import { checkArchiveExists } from '@/lib/storage/archives';
import { sendBackupCompleteEmail } from '@/lib/email/notifications';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/ip';
import { PlatformType } from '@/lib/constants';

interface RouteParams {
  params: Promise<{ archiveId: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session.user.email) {
      const err = createErrorResponse('AUTH_REQUIRED');
      return NextResponse.json(err.error, { status: err.status });
    }

    const { archiveId } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(archiveId)) {
      const err = createErrorResponse('INVALID_INPUT', 'Invalid archive ID format');
      return NextResponse.json(err.error, { status: err.status });
    }

    const archive = await prisma.archive.findUnique({
      where: { id: archiveId },
    });

    if (!archive) {
      const err = createErrorResponse('ARCHIVE_NOT_FOUND');
      return NextResponse.json(err.error, { status: err.status });
    }

    if (archive.userId !== session.user.id) {
      const err = createErrorResponse('AUTH_REQUIRED');
      return NextResponse.json(err.error, { status: err.status });
    }

    if (new Date() > archive.expiresAt) {
      const err = createErrorResponse('ARCHIVE_EXPIRED');
      return NextResponse.json(err.error, { status: err.status });
    }

    const exists = await checkArchiveExists(archive.s3Key);
    if (!exists) {
      const err = createErrorResponse('ARCHIVE_NOT_FOUND', 'Archive file no longer exists in storage');
      return NextResponse.json(err.error, { status: err.status });
    }

    await sendBackupCompleteEmail(
      session.user.email,
      archive.platform as PlatformType,
      archiveId
    );

    await logAudit({
      userId: session.user.id,
      action: 'archive.email_resent',
      platform: archive.platform,
      metadata: { archiveId },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Resend email error:', error);
    const err = createErrorResponse('INTERNAL_ERROR');
    return NextResponse.json(err.error, { status: err.status });
  }
}
