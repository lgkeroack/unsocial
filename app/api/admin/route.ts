import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createErrorResponse } from '@/lib/errors';
import { logAudit } from '@/lib/audit';

function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  return adminEmails.includes(email.toLowerCase());
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      const err = createErrorResponse('AUTH_REQUIRED');
      return NextResponse.json(err.error, { status: err.status });
    }

    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Admin access required', suggestion: 'You do not have permission to access this resource.' } },
        { status: 403 }
      );
    }

    const [totalJobs, activeJobs, completedJobs, failedJobs, totalUsers, totalArchives] = await Promise.all([
      prisma.backupJob.count(),
      prisma.backupJob.count({ where: { status: 'active' } }),
      prisma.backupJob.count({ where: { status: 'completed' } }),
      prisma.backupJob.count({ where: { status: 'failed' } }),
      prisma.user.count(),
      prisma.archive.count(),
    ]);

    const recentJobs = await prisma.backupJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Health checks
    let redisHealthy = false;
    try {
      const Redis = (await import('ioredis')).default;
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        const redis = new Redis(redisUrl, { connectTimeout: 3000, lazyConnect: true });
        await redis.connect();
        await redis.ping();
        redisHealthy = true;
        await redis.quit();
      }
    } catch {
      redisHealthy = false;
    }

    let s3Healthy = false;
    try {
      const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
      const bucket = process.env.STORAGE_BUCKET;
      if (bucket) {
        const s3 = new S3Client({
          region: process.env.STORAGE_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.STORAGE_ACCESS_KEY || '',
            secretAccessKey: process.env.STORAGE_SECRET_KEY || '',
          },
          ...(process.env.STORAGE_ENDPOINT ? { endpoint: process.env.STORAGE_ENDPOINT } : {}),
        });
        await s3.send(new HeadBucketCommand({ Bucket: bucket }));
        s3Healthy = true;
      }
    } catch {
      s3Healthy = false;
    }

    // DB is healthy if we got this far
    const dbHealthy = true;

    await logAudit({
      userId: session.user.id,
      action: 'admin.accessed',
    });

    return NextResponse.json({
      stats: { totalJobs, activeJobs, completedJobs, failedJobs, totalUsers, totalArchives },
      recentJobs: recentJobs.map(job => ({
        id: job.id,
        platform: job.platform,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt.toISOString(),
        userName: job.user?.name || 'Unknown',
      })),
      health: { redis: redisHealthy, s3: s3Healthy, database: dbHealthy },
    });
  } catch (error) {
    console.error('Admin API error:', error);
    const err = createErrorResponse('INTERNAL_ERROR');
    return NextResponse.json(err.error, { status: err.status });
  }
}
