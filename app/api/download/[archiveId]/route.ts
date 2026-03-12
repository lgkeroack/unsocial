import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getArchiveDownloadUrl } from '@/lib/storage/archives';
import { createErrorResponse } from '@/lib/errors';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/ip';

interface RouteParams {
  params: Promise<{ archiveId: string }>;
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

    const { archiveId } = await params;

    // Validate archiveId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(archiveId)) {
      const err = createErrorResponse('INVALID_INPUT', 'Invalid archive ID format');
      return NextResponse.json(err.error, { status: err.status });
    }

    const downloadUrl = await getArchiveDownloadUrl(
      archiveId,
      session.user.id
    );

    if (!downloadUrl) {
      const err = createErrorResponse('ARCHIVE_NOT_FOUND');
      return NextResponse.json(err.error, { status: err.status });
    }

    await logAudit({
      userId: session.user.id,
      action: 'archive.downloaded',
      metadata: { archiveId },
      ipAddress: getClientIp(request),
    });

    // Redirect to the signed URL
    return NextResponse.redirect(downloadUrl);

  } catch (error) {
    console.error('Download URL generation error:', error);
    const err = createErrorResponse('INTERNAL_ERROR');
    return NextResponse.json(err.error, { status: err.status });
  }
}
