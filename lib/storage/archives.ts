import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { PlatformType, PLATFORMS, isValidUUID, sanitizeId } from '@/lib/constants';

function getS3Client(): S3Client {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Storage configuration is incomplete. Check STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, and STORAGE_SECRET_KEY.');
  }

  return new S3Client({
    endpoint,
    region: 'auto',
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
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

      return signedUrl;
    } catch {
      // File not found in this platform folder, try next
      continue;
    }
  }

  return null;
}
