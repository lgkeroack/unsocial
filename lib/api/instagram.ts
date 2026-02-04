/**
 * Instagram API Client
 *
 * Handles data extraction from Instagram using the Meta Graph API.
 * Note: Instagram Basic Display API has limited access. For production,
 * you may need to use Instagram Graph API (business accounts) or the
 * official "Download Your Data" feature.
 */

import archiver from 'archiver';

interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
  timestamp: string;
  permalink: string;
}

interface InstagramUser {
  id: string;
  username: string;
  account_type: string;
  media_count: number;
}

interface DownloadedFile {
  id: string;
  filename: string;
  data: Buffer;
}

interface InstagramBackup {
  profile: InstagramUser | null;
  media: InstagramMedia[];
  downloadedFiles: DownloadedFile[];
}

export class InstagramAPI {
  private accessToken: string;
  private baseUrl = 'https://graph.instagram.com';

  constructor(accessToken: string) {
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error('Invalid access token');
    }
    this.accessToken = accessToken;
  }

  /**
   * Get user profile information
   */
  async getUserProfile(): Promise<InstagramUser> {
    const url = new URL(`${this.baseUrl}/me`);
    url.searchParams.set('fields', 'id,username,account_type,media_count');
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Instagram API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get user's media (posts, photos, videos)
   */
  async getUserMedia(limit = 100): Promise<InstagramMedia[]> {
    const allMedia: InstagramMedia[] = [];
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const initialUrl = new URL(`${this.baseUrl}/me/media`);
    initialUrl.searchParams.set('fields', 'id,media_type,media_url,thumbnail_url,caption,timestamp,permalink');
    initialUrl.searchParams.set('limit', safeLimit.toString());
    initialUrl.searchParams.set('access_token', this.accessToken);

    let url: string | null = initialUrl.toString();

    while (url) {
      const response: Response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Instagram API error: ${response.status} - ${errorText}`);
      }

      const data: { data?: InstagramMedia[]; paging?: { next?: string } } = await response.json();
      if (Array.isArray(data.data)) {
        allMedia.push(...data.data);
      }

      // Handle pagination - validate the next URL
      url = data.paging?.next || null;
      if (url && !url.startsWith('https://graph.instagram.com')) {
        url = null; // Reject invalid URLs
      }
    }

    return allMedia;
  }

  /**
   * Download media file (photo or video)
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    // Validate URL to prevent SSRF
    const parsedUrl = new URL(mediaUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Strict host validation to prevent subdomain bypass attacks
    const allowedHostPatterns = [
      /^([a-z0-9-]+\.)*cdninstagram\.com$/,
      /^([a-z0-9-]+\.)*instagram\.com$/,
      /^([a-z0-9-]+\.)*fbcdn\.net$/,
    ];

    const isAllowedHost = allowedHostPatterns.some(pattern =>
      pattern.test(hostname)
    );

    if (!isAllowedHost) {
      throw new Error('Invalid media URL host');
    }

    // Ensure HTTPS
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
   * Get followers list
   * Note: This requires Instagram Graph API (business accounts)
   */
  async getFollowers(): Promise<unknown[]> {
    throw new Error('Followers endpoint requires Instagram Graph API with business account');
  }

  /**
   * Request data download archive
   * This triggers Instagram's official "Download Your Data" feature
   */
  async requestDataArchive(): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: 'Data archive must be requested manually at instagram.com/download/request'
    };
  }

  /**
   * Complete backup workflow
   */
  async backupAllData(onProgress?: (progress: number, status: string) => void): Promise<InstagramBackup> {
    const backup: InstagramBackup = {
      profile: null,
      media: [],
      downloadedFiles: []
    };

    try {
      // Step 1: Get profile
      if (onProgress) onProgress(10, 'Fetching profile information...');
      backup.profile = await this.getUserProfile();

      // Step 2: Get all media
      if (onProgress) onProgress(30, 'Fetching posts and media...');
      backup.media = await this.getUserMedia();

      // Step 3: Download media files
      if (onProgress) onProgress(50, 'Downloading media files...');
      const totalMedia = backup.media.length;

      for (let i = 0; i < totalMedia; i++) {
        const media = backup.media[i];
        try {
          const fileData = await this.downloadMedia(media.media_url);
          const extension = media.media_type === 'VIDEO' ? 'mp4' : 'jpg';
          const safeId = media.id.replace(/[^a-zA-Z0-9_-]/g, '');

          backup.downloadedFiles.push({
            id: media.id,
            filename: `${safeId}.${extension}`,
            data: fileData
          });

          if (onProgress) {
            const progress = 50 + Math.round((i / totalMedia) * 40);
            onProgress(progress, `Downloaded ${i + 1}/${totalMedia} files...`);
          }
        } catch (error) {
          console.error(`Failed to download media ${media.id}:`, error);
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
export async function createInstagramArchive(backup: InstagramBackup): Promise<Buffer> {
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

    // Add media metadata
    archive.append(JSON.stringify(backup.media, null, 2), {
      name: 'media.json'
    });

    // Add downloaded files
    for (const file of backup.downloadedFiles) {
      archive.append(file.data, {
        name: `media/${file.filename}`
      });
    }

    // Add README
    const readme = `
# Your Instagram Backup

Generated: ${new Date().toISOString()}
Username: ${backup.profile?.username || 'Unknown'}
Total Posts: ${backup.media.length}

## Contents

- profile.json: Your profile information
- media.json: Metadata for all your posts
- media/: All your photos and videos

## File Format

All files are in standard formats:
- Photos: JPEG
- Videos: MP4
- Data: JSON

You can view these files with any standard image/video viewer and text editor.
    `.trim();

    archive.append(readme, { name: 'README.txt' });

    archive.finalize();
  });
}
