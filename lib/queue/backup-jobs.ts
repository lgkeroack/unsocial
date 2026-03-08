import Queue, { Job } from 'bull';
import { InstagramAPI, createInstagramArchive } from '@/lib/api/instagram';
import { FacebookAPI, createFacebookArchive } from '@/lib/api/facebook';
import { LinkedInAPI, createLinkedInArchive } from '@/lib/api/linkedin';
import { uploadArchive } from '@/lib/storage/archives';
import { sendBackupCompleteEmail } from '@/lib/email/notifications';
import { PlatformType } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

interface BackupJobData {
  userId: string;
  platform: PlatformType;
  accessToken: string;
  dataTypes: string[];
  provider: string;
  userEmail?: string;
  _dbJobId?: string;
}

interface BackupJobResult {
  success: boolean;
  archiveId: string;
}

interface JobStatus {
  jobId: string;
  state: string;
  progress: number;
  result: BackupJobResult | null;
  userId: string;
}

let backupQueue: Queue.Queue<BackupJobData> | null = null;
let redisAvailable = true;

function getBackupQueue(): Queue.Queue<BackupJobData> | null {
  if (!redisAvailable) return null;

  if (!backupQueue) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.warn('REDIS_URL not set, falling back to in-process backup execution');
      redisAvailable = false;
      return null;
    }

    try {
      backupQueue = new Queue<BackupJobData>('backup-jobs', redisUrl, {
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: 100,
          removeOnFail: 100
        }
      });

      backupQueue.on('error', () => {
        console.warn('Redis connection lost, future jobs will use in-process fallback');
        redisAvailable = false;
        backupQueue = null;
      });

      backupQueue.process(processBackupJob);
    } catch {
      console.warn('Failed to connect to Redis, falling back to in-process backup execution');
      redisAvailable = false;
      return null;
    }
  }
  return backupQueue;
}

async function runBackupForPlatform(
  platform: PlatformType,
  accessToken: string,
  dataTypes: string[],
  onProgress: (progress: number) => void
): Promise<Buffer> {
  switch (platform) {
    case 'instagram': {
      const instagramAPI = new InstagramAPI(accessToken);
      const backup = await instagramAPI.backupAllData((progress) => {
        onProgress(progress);
      });
      return createInstagramArchive(backup);
    }
    case 'facebook': {
      const facebookAPI = new FacebookAPI(accessToken);
      const backup = await facebookAPI.backupAllData(dataTypes, (progress) => {
        onProgress(progress);
      });
      return createFacebookArchive(backup);
    }
    case 'linkedin': {
      const linkedinAPI = new LinkedInAPI(accessToken);
      const backup = await linkedinAPI.backupAllData(dataTypes, (progress) => {
        onProgress(progress);
      });
      return createLinkedInArchive(backup);
    }
    default:
      throw new Error(`Invalid platform: ${platform}`);
  }
}

async function processBackupJob(job: Job<BackupJobData>): Promise<BackupJobResult> {
  const { userId, platform, accessToken, dataTypes, _dbJobId } = job.data;
  const dbJobId = _dbJobId || job.id.toString();

  try {
    // Mark as active in database
    await prisma.backupJob.update({
      where: { id: dbJobId },
      data: { status: 'active', queueJobId: job.id.toString() },
    }).catch(() => {});

    await job.progress(10);

    const archive = await runBackupForPlatform(platform, accessToken, dataTypes, (progress) => {
      job.progress(progress);
      prisma.backupJob.update({
        where: { id: dbJobId },
        data: { progress },
      }).catch(() => {});
    });

    await job.progress(95);
    const archiveId = await uploadArchive(userId, platform, archive);

    // Create archive record
    const s3Key = `${userId}/${platform}/${archiveId}.zip`;
    await prisma.archive.create({
      data: {
        userId,
        backupJobId: dbJobId,
        platform,
        s3Key,
        sizeBytes: archive.length,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    }).catch((err) => console.error('Failed to create archive record:', err));

    // Mark as completed
    await prisma.backupJob.update({
      where: { id: dbJobId },
      data: { status: 'completed', progress: 100 },
    }).catch(() => {});

    await logAudit({
      userId,
      action: 'backup.completed',
      platform,
      metadata: { archiveId, jobId: dbJobId },
    });

    if (job.data.userEmail) {
      await sendBackupCompleteEmail(job.data.userEmail, platform, archiveId);
    }

    await job.progress(100);
    return { success: true, archiveId };

  } catch (error) {
    console.error('Backup job failed:', error);

    await prisma.backupJob.update({
      where: { id: dbJobId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    }).catch(() => {});

    await logAudit({
      userId,
      action: 'backup.failed',
      platform,
      metadata: { error: error instanceof Error ? error.message : 'Unknown error', jobId: dbJobId },
    });

    throw error;
  }
}

async function processJobInProcess(dbJobId: string, data: BackupJobData): Promise<void> {
  const { userId, platform, accessToken, dataTypes } = data;

  try {
    await prisma.backupJob.update({
      where: { id: dbJobId },
      data: { status: 'active' },
    });

    const archive = await runBackupForPlatform(platform, accessToken, dataTypes, (progress) => {
      prisma.backupJob.update({
        where: { id: dbJobId },
        data: { progress },
      }).catch(() => {});
    });

    const archiveId = await uploadArchive(userId, platform, archive);

    const s3Key = `${userId}/${platform}/${archiveId}.zip`;
    await prisma.archive.create({
      data: {
        userId,
        backupJobId: dbJobId,
        platform,
        s3Key,
        sizeBytes: archive.length,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }).catch((err) => console.error('Failed to create archive record:', err));

    await prisma.backupJob.update({
      where: { id: dbJobId },
      data: { status: 'completed', progress: 100 },
    });

    await logAudit({
      userId,
      action: 'backup.completed',
      platform,
      metadata: { archiveId, jobId: dbJobId },
    });

    if (data.userEmail) {
      await sendBackupCompleteEmail(data.userEmail, platform, archiveId);
    }
  } catch (error) {
    console.error('In-process backup failed:', error);

    await prisma.backupJob.update({
      where: { id: dbJobId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    }).catch(() => {});

    await logAudit({
      userId,
      action: 'backup.failed',
      platform,
      metadata: { error: error instanceof Error ? error.message : 'Unknown error', jobId: dbJobId },
    });
  }
}

export async function createBackupJob(data: BackupJobData): Promise<string> {
  // Always create Prisma record first (source of truth)
  const dbJob = await prisma.backupJob.create({
    data: {
      userId: data.userId,
      platform: data.platform,
      status: 'queued',
      dataTypes: data.dataTypes,
    },
  });

  await logAudit({
    userId: data.userId,
    action: 'backup.started',
    platform: data.platform,
    metadata: { jobId: dbJob.id, dataTypes: data.dataTypes },
  });

  const queue = getBackupQueue();

  if (queue) {
    try {
      const job = await queue.add({ ...data, _dbJobId: dbJob.id });
      await prisma.backupJob.update({
        where: { id: dbJob.id },
        data: { queueJobId: job.id.toString() },
      });
    } catch {
      console.warn('Failed to add job to Redis queue, falling back to in-process');
      // Fire-and-forget in-process execution
      processJobInProcess(dbJob.id, data);
    }
  } else {
    // Fire-and-forget in-process execution
    processJobInProcess(dbJob.id, data);
  }

  return dbJob.id;
}

export async function getBackupJobStatus(jobId: string): Promise<JobStatus | null> {
  // Try Redis first for real-time progress on active jobs
  const queue = getBackupQueue();
  if (queue) {
    try {
      // jobId might be a cuid (DB) or numeric (Bull). Try DB lookup first for queueJobId.
      const dbJob = await prisma.backupJob.findUnique({ where: { id: jobId } });
      if (dbJob?.queueJobId) {
        const job = await queue.getJob(dbJob.queueJobId);
        if (job) {
          const state = await job.getState();
          const progress = job.progress();
          const result = job.returnvalue as BackupJobResult | null;

          return {
            jobId: dbJob.id,
            state: state === 'completed' ? 'completed' : state === 'failed' ? 'failed' : state === 'active' ? 'active' : 'queued',
            progress: typeof progress === 'number' ? progress : 0,
            result,
            userId: dbJob.userId,
          };
        }
      }
    } catch {
      // Redis unavailable, fall through to Prisma
    }
  }

  // Fall back to Prisma
  const dbJob = await prisma.backupJob.findUnique({
    where: { id: jobId },
    include: { archive: true },
  });

  if (!dbJob) return null;

  return {
    jobId: dbJob.id,
    state: dbJob.status,
    progress: dbJob.progress,
    result: dbJob.archive
      ? { success: true, archiveId: dbJob.archive.id }
      : null,
    userId: dbJob.userId,
  };
}
