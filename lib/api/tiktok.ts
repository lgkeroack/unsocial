/**
 * TikTok API Client
 *
 * Handles data extraction from TikTok using the TikTok API v2.
 * Note: TikTok API has limited access. For complete data,
 * users should also use TikTok's official data download feature.
 */

import archiver from 'archiver';

interface TikTokUser {
  open_id: string;
  union_id?: string;
  avatar_url: string;
  display_name: string;
  bio_description?: string;
  follower_count?: number;
  following_count?: number;
  video_count?: number;
  likes_count?: number;
}

interface TikTokVideo {
  id: string;
  title?: string;
  create_time: number;
  cover_image_url?: string;
  share_url?: string;
  video_description?: string;
  duration?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  view_count?: number;
}

interface DownloadedFile {
  id: string;
  filename: string;
  data: Buffer;
}

interface TikTokBackup {
  profile: TikTokUser | null;
  videos: TikTokVideo[];
  downloadedFiles: DownloadedFile[];
}

export class TikTokAPI {
  private accessToken: string;
  private baseUrl = 'https://open.tiktokapis.com/v2';

  constructor(accessToken: string) {
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error('Invalid access token');
    }
    this.accessToken = accessToken;
  }

  /**
   * Get user profile information
   */
  async getUserInfo(): Promise<TikTokUser> {
    const url = new URL(`${this.baseUrl}/user/info/`);
    url.searchParams.set('fields', 'open_id,union_id,avatar_url,display_name,bio_description,follower_count,following_count,video_count,likes_count');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TikTok API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (result.error?.code !== 'ok' && result.error?.code) {
      throw new Error(`TikTok API error: ${result.error.code} - ${result.error.message}`);
    }

    return result.data.user;
  }

  /**
   * Get user's videos with pagination
   */
  async getUserVideos(cursor?: number, maxCount = 20): Promise<{ videos: TikTokVideo[]; cursor: number; hasMore: boolean }> {
    const safeMaxCount = Math.min(Math.max(1, maxCount), 20);

    const body: Record<string, unknown> = { max_count: safeMaxCount };
    if (cursor) {
      body.cursor = cursor;
    }

    const url = new URL(`${this.baseUrl}/video/list/`);
    url.searchParams.set('fields', 'id,title,create_time,cover_image_url,share_url,video_description,duration,like_count,comment_count,share_count,view_count');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TikTok API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (result.error?.code !== 'ok' && result.error?.code) {
      throw new Error(`TikTok API error: ${result.error.code} - ${result.error.message}`);
    }

    return {
      videos: result.data.videos || [],
      cursor: result.data.cursor || 0,
      hasMore: result.data.has_more || false,
    };
  }

  /**
   * Download media file (video cover or video)
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    const parsedUrl = new URL(mediaUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Strict host validation to prevent SSRF
    const allowedHostPatterns = [
      /^([a-z0-9-]+\.)*tiktokcdn\.com$/,
      /^([a-z0-9-]+\.)*musical\.ly$/,
      /^([a-z0-9-]+\.)*tiktokv\.com$/,
      /^([a-z0-9-]+\.)*tiktokcdn-us\.com$/,
    ];

    const isAllowedHost = allowedHostPatterns.some(pattern =>
      pattern.test(hostname)
    );

    if (!isAllowedHost) {
      throw new Error('Invalid media URL host');
    }

    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed');
    }

    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Complete backup workflow
   */
  async backupAllData(
    selectedTypes: string[],
    onProgress?: (progress: number, status: string) => void
  ): Promise<TikTokBackup> {
    const backup: TikTokBackup = {
      profile: null,
      videos: [],
      downloadedFiles: [],
    };

    try {
      // Step 1: Get profile
      if (onProgress) onProgress(10, 'Fetching profile information...');
      backup.profile = await this.getUserInfo();

      // Step 2: Get all videos
      if (selectedTypes.includes('videos') || selectedTypes.includes('profile')) {
        if (onProgress) onProgress(30, 'Fetching videos...');
        let hasMore = true;
        let cursor: number | undefined = undefined;

        while (hasMore) {
          const result = await this.getUserVideos(cursor);
          backup.videos.push(...result.videos);
          hasMore = result.hasMore;
          cursor = result.cursor;
        }
      }

      // Step 3: Download cover images for videos
      if (onProgress) onProgress(50, 'Downloading video covers...');
      const totalVideos = backup.videos.length;

      for (let i = 0; i < totalVideos; i++) {
        const video = backup.videos[i];
        try {
          if (video.cover_image_url) {
            const fileData = await this.downloadMedia(video.cover_image_url);
            const safeId = video.id.replace(/[^a-zA-Z0-9_-]/g, '');

            backup.downloadedFiles.push({
              id: video.id,
              filename: `cover_${safeId}.jpg`,
              data: fileData,
            });
          }

          if (onProgress && totalVideos > 0) {
            const progress = 50 + Math.round((i / totalVideos) * 40);
            onProgress(progress, `Downloaded ${i + 1}/${totalVideos} video covers...`);
          }
        } catch (error) {
          console.error(`Failed to download cover for video ${video.id}:`, error);
        }
      }

      if (onProgress) onProgress(100, 'Backup complete!');
      return backup;

    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }
}

/**
 * Helper function to create archive package
 */
export async function createTikTokArchive(backup: TikTokBackup): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    // Add profile JSON
    archive.append(JSON.stringify(backup.profile, null, 2), {
      name: 'profile.json'
    });

    // Add videos metadata
    if (backup.videos.length > 0) {
      archive.append(JSON.stringify(backup.videos, null, 2), {
        name: 'videos.json'
      });
    }

    // Add downloaded files (cover images)
    for (const file of backup.downloadedFiles) {
      archive.append(file.data, {
        name: `media/${file.filename}`
      });
    }

    // Add README
    const readme = `
# Your TikTok Backup

Generated: ${new Date().toISOString()}
Display Name: ${backup.profile?.display_name || 'Unknown'}
Total Videos: ${backup.videos.length}

## Contents

- profile.json: Your profile information
- videos.json: Metadata for all your videos (titles, descriptions, stats)
- media/: Cover images for your videos

## Important Notes

This backup contains data available through the TikTok API. For a complete backup including:
- Direct messages
- Saved sounds and effects
- Full video files (not just covers)
- Activity history

Please also request your data through TikTok's privacy settings:
Settings and privacy > Manage account > Download your data

## File Format

All files are in standard formats:
- Images: JPEG
- Data: JSON

You can view these files with any standard image viewer and text editor.
    `.trim();

    archive.append(readme, { name: 'README.txt' });

    archive.finalize();
  });
}
