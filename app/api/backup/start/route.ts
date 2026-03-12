import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createBackupJob } from '@/lib/queue/backup-jobs';
import { createErrorResponse } from '@/lib/errors';
import { logAudit } from '@/lib/audit';
import { getClientIp } from '@/lib/ip';

const VALID_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'tiktok'] as const;
type ValidPlatform = typeof VALID_PLATFORMS[number];

// Platform-specific allowed data types
const ALLOWED_DATA_TYPES: Record<ValidPlatform, string[]> = {
  instagram: ['profile', 'posts', 'stories', 'reels', 'messages', 'followers'],
  facebook: ['profile', 'posts', 'photos', 'videos', 'friends', 'groups', 'events', 'messages'],
  linkedin: ['profile', 'connections', 'posts', 'messages', 'recommendations', 'applications'],
  tiktok: ['profile', 'videos', 'liked_videos', 'followers', 'following'],
};

function isValidPlatform(platform: unknown): platform is ValidPlatform {
  return typeof platform === 'string' && VALID_PLATFORMS.includes(platform as ValidPlatform);
}

function isValidDataTypes(dataTypes: unknown): dataTypes is string[] {
  return Array.isArray(dataTypes) && dataTypes.every(dt => typeof dt === 'string');
}

function areDataTypesAllowedForPlatform(platform: ValidPlatform, dataTypes: string[]): boolean {
  const allowed = ALLOWED_DATA_TYPES[platform];
  return dataTypes.every(dt => allowed.includes(dt));
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      const err = createErrorResponse('AUTH_REQUIRED');
      return NextResponse.json(err.error, { status: err.status });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const err = createErrorResponse('INVALID_INPUT', 'Invalid JSON body');
      return NextResponse.json(err.error, { status: err.status });
    }

    if (typeof body !== 'object' || body === null) {
      const err = createErrorResponse('INVALID_INPUT', 'Request body must be an object');
      return NextResponse.json(err.error, { status: err.status });
    }

    const { platform, dataTypes } = body as { platform?: unknown; dataTypes?: unknown };

    if (!isValidPlatform(platform)) {
      const err = createErrorResponse('INVALID_INPUT', 'Invalid platform. Must be one of: instagram, facebook, linkedin, tiktok');
      return NextResponse.json(err.error, { status: err.status });
    }

    if (!isValidDataTypes(dataTypes)) {
      const err = createErrorResponse('INVALID_INPUT', 'Invalid dataTypes. Must be an array of strings');
      return NextResponse.json(err.error, { status: err.status });
    }

    if (!areDataTypesAllowedForPlatform(platform, dataTypes)) {
      const err = createErrorResponse('INVALID_INPUT', `Invalid dataTypes for ${platform}. Allowed types: ${ALLOWED_DATA_TYPES[platform].join(', ')}`);
      return NextResponse.json(err.error, { status: err.status });
    }

    const jobId = await createBackupJob({
      userId: session.user.id,
      platform,
      accessToken: session.accessToken,
      dataTypes,
      provider: session.provider || platform,
      userEmail: session.user.email || undefined
    });

    await logAudit({
      userId: session.user.id,
      action: 'backup.started',
      platform,
      metadata: { jobId, dataTypes },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Backup started'
    });

  } catch (error) {
    console.error('Backup start error:', error);
    const err = createErrorResponse('BACKUP_START_FAILED');
    return NextResponse.json(err.error, { status: err.status });
  }
}
