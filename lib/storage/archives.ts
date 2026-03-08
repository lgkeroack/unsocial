import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { PlatformType, PLATFORMS, isValidUUID, sanitizeId } from '@/lib/constants';

function getS3Client(): S3Client {
  const accessKeyId = process.env.STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET_KEY;
  const region = process.env.STORAGE_REGION || 'us-east-1';
  const endpoint = process.env.STORAGE_ENDPOINT;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Storage configuration is incomplete. Check STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY.');
  }

  const config: ConstructorParameters<typeof S3Client>[0] = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  };

  // Custom endpoint for R2 or other S3-compatible services
  if (endpoint) {
    config.endpoint = endpoint;
  }

  return new S3Client(config);
}

export async function uploadArchive(
  userId: string,
  platform: PlatformType,
  archiveBuffer: Buffer
): Promise<string> {
  const s3Client = getS3Client();
  const bucket = process.env.STORAGE_BUCKET;

  if (!bucket) {
    throw new Error('STORAGE_BUCKET environment variable is not set');
  }

  // Sanitize userId to prevent path traversal
  const safeUserId = sanitizeId(userId);
  const archiveId = randomUUID();
  const key = `${safeUserId}/${platform}/${archiveId}.zip`;

  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: archiveBuffer,
    ContentType: 'application/zip',
    Metadata: {
      userId: safeUserId,
      platform,
      createdAt: new Date().toISOString()
    }
  }));

  return archiveId;
}

export async function getArchiveDownloadUrl(
  archiveId: string,
  userId: string
): Promise<string | null> {
  const s3Client = getS3Client();
  const bucket = process.env.STORAGE_BUCKET;

  if (!bucket) {
    throw new Error('STORAGE_BUCKET environment variable is not set');
  }

  // Sanitize inputs
  const safeUserId = sanitizeId(userId);
  const safeArchiveId = sanitizeId(archiveId);

  // Validate UUID format
  if (!isValidUUID(safeArchiveId)) {
    return null;
  }

  for (const platform of PLATFORMS) {
    const key = `${safeUserId}/${platform}/${safeArchiveId}.zip`;

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 604800 // 7 days (matches email promise)
      });

      // Increment download count in database (fire-and-forget)
      try {
        const { prisma } = await import('@/lib/db');
        await prisma.archive.updateMany({
          where: { s3Key: key },
          data: { downloadCount: { increment: 1 } },
        });
      } catch {
        // Never fail the download due to count tracking
      }

      return signedUrl;
    } catch {
      // File not found in this platform folder, try next
      continue;
    }
  }

  return null;
}

export async function checkArchiveExists(s3Key: string): Promise<boolean> {
  const s3Client = getS3Client();
  const bucket = process.env.STORAGE_BUCKET;

  if (!bucket) {
    return false;
  }

  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    }));
    return true;
  } catch {
    return false;
  }
}
