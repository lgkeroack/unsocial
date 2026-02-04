import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getArchiveDownloadUrl } from '@/lib/storage/archives';

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
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { archiveId } = await params;

    // Validate archiveId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(archiveId)) {
      return NextResponse.json(
        { error: 'Invalid archive ID format' },
        { status: 400 }
      );
    }

    const downloadUrl = await getArchiveDownloadUrl(
      archiveId,
      session.user.id
    );

    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'Archive not found or expired' },
        { status: 404 }
      );
    }

    // Redirect to the signed URL
    return NextResponse.redirect(downloadUrl);

  } catch (error) {
    console.error('Download URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
