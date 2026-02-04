import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createBackupJob } from '@/lib/queue/backup-jobs';

const VALID_PLATFORMS = ['instagram', 'facebook', 'linkedin'] as const;
type ValidPlatform = typeof VALID_PLATFORMS[number];

// Platform-specific allowed data types
const ALLOWED_DATA_TYPES: Record<ValidPlatform, string[]> = {
  instagram: ['profile', 'posts', 'stories', 'reels', 'messages', 'followers'],
  facebook: ['profile', 'posts', 'photos', 'videos', 'friends', 'groups', 'events', 'messages'],
  linkedin: ['profile', 'connections', 'posts', 'messages', 'recommendations', 'applications']
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
      return NextResponse.json(
        { error: 'Not authenticated. Please log in first.' },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Request body must be an object' },
        { status: 400 }
      );
    }

    const { platform, dataTypes } = body as { platform?: unknown; dataTypes?: unknown };

    if (!isValidPlatform(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Must be one of: instagram, facebook, linkedin' },
        { status: 400 }
      );
    }

    if (!isValidDataTypes(dataTypes)) {
      return NextResponse.json(
        { error: 'Invalid dataTypes. Must be an array of strings' },
        { status: 400 }
      );
    }

    if (!areDataTypesAllowedForPlatform(platform, dataTypes)) {
      return NextResponse.json(
        { error: `Invalid dataTypes for ${platform}. Allowed types: ${ALLOWED_DATA_TYPES[platform].join(', ')}` },
        { status: 400 }
      );
    }

    const jobId = await createBackupJob({
      userId: session.user.id,
      platform,
      accessToken: session.accessToken,
      dataTypes,
      provider: session.provider || platform,
      userEmail: session.user.email || undefined
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Backup started'
    });

  } catch (error) {
    console.error('Backup start error:', error);
    return NextResponse.json(
      { error: 'Failed to start backup' },
      { status: 500 }
    );
  }
}
