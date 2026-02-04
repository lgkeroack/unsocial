import Queue, { Job } from 'bull';
import { InstagramAPI, createInstagramArchive } from '@/lib/api/instagram';
import { FacebookAPI, createFacebookArchive } from '@/lib/api/facebook';
import { LinkedInAPI, createLinkedInArchive } from '@/lib/api/linkedin';
import { uploadArchive } from '@/lib/storage/archives';
import { sendBackupCompleteEmail } from '@/lib/email/notifications';

type PlatformType = 'instagram' | 'facebook' | 'linkedin';

interface BackupJobData {
  userId: string;
  platform: PlatformType;
  accessToken: string;
  dataTypes: string[];
  provider: string;
  userEmail?: string;
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

// Create queue - handle missing Redis gracefully
let backupQueue: Queue.Queue<BackupJobData> | null = null;

function getBackupQueue(): Queue.Queue<BackupJobData> {
  if (!backupQueue) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set');
    }
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

    // Set up job processor
    backupQueue.process(processBackupJob);
  }
  return backupQueue;
}

async function processBackupJob(job: Job<BackupJobData>): Promise<BackupJobResult> {
  const { userId, platform, accessToken, dataTypes } = job.data;

  try {
    await job.progress(10);

    let archive: Buffer;

    switch (platform) {
      case 'instagram': {
        const instagramAPI = new InstagramAPI(accessToken);
        const backup = await instagramAPI.backupAllData((progress) => {
          job.progress(progress);
        });
        archive = await createInstagramArchive(backup);
        break;
      }

      case 'facebook': {
        const facebookAPI = new FacebookAPI(accessToken);
        const backup = await facebookAPI.backupAllData(dataTypes, (progress) => {
          job.progress(progress);
        });
        archive = await createFacebookArchive(backup);
        break;
      }

      case 'linkedin': {
        const linkedinAPI = new LinkedInAPI(accessToken);
        const backup = await linkedinAPI.backupAllData(dataTypes, (progress) => {
          job.progress(progress);
        });
        archive = await createLinkedInArchive(backup);
        break;
      }

      default:
        throw new Error(`Invalid platform: ${platform}`);
    }

    await job.progress(95);
    const archiveId = await uploadArchive(userId, platform, archive);

    if (job.data.userEmail) {
      await sendBackupCompleteEmail(job.data.userEmail, platform, archiveId);
    }

    await job.progress(100);
    return { success: true, archiveId };

  } catch (error) {
    console.error('Backup job failed:', error);
    throw error;
  }
}

export async function createBackupJob(data: BackupJobData): Promise<string> {
  const queue = getBackupQueue();
  const job = await queue.add(data);
  return job.id.toString();
}

export async function getBackupJobStatus(jobId: string): Promise<JobStatus | null> {
  const queue = getBackupQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress();
  const result = job.returnvalue as BackupJobResult | null;

  return {
    jobId: job.id.toString(),
    state,
    progress: typeof progress === 'number' ? progress : 0,
    result,
    userId: job.data.userId
  };
}
