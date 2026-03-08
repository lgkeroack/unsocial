/**
 * Facebook API Client
 *
 * Handles data extraction from Facebook using the Meta Graph API.
 * Requires appropriate permissions and app review for production use.
 */

import archiver from 'archiver';

interface FacebookPost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  updated_time: string;
  permalink_url?: string;
  full_picture?: string;
  attachments?: unknown;
}

interface FacebookPhoto {
  id: string;
  name?: string;
  created_time: string;
  picture: string;
  images: { source: string; width: number; height: number }[];
}

interface FacebookUser {
  id: string;
  name: string;
  email?: string;
  picture?: unknown;
}

interface DownloadedFile {
  id: string;
  type: string;
  filename: string;
  data: Buffer;
}

interface FacebookBackup {
  profile: FacebookUser | null;
  posts: FacebookPost[];
  photos: FacebookPhoto[];
  albums: unknown[];
  videos: unknown[];
  friends: unknown[];
  groups: unknown[];
  events: unknown[];
  downloadedFiles: DownloadedFile[];
}

export class FacebookAPI {
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor(accessToken: string) {
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error('Invalid access token');
    }
    this.accessToken = accessToken;
  }

  /**
   * Get user profile information
   */
  async getUserProfile(): Promise<FacebookUser> {
    const url = new URL(`${this.baseUrl}/me`);
    url.searchParams.set('fields', 'id,name,email,picture');
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get user's posts
   */
  async getUserPosts(limit = 100): Promise<FacebookPost[]> {
    const allPosts: FacebookPost[] = [];
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const initialUrl = new URL(`${this.baseUrl}/me/posts`);
    initialUrl.searchParams.set('fields', 'id,message,story,created_time,updated_time,permalink_url,full_picture,attachments');
    initialUrl.searchParams.set('limit', safeLimit.toString());
    initialUrl.searchParams.set('access_token', this.accessToken);

    let url: string | null = initialUrl.toString();

    while (url) {
      const response: Response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
      }

      const data: { data?: FacebookPost[]; paging?: { next?: string } } = await response.json();
      if (Array.isArray(data.data)) {
        allPosts.push(...data.data);
      }

      url = data.paging?.next || null;
      if (url && !url.startsWith('https://graph.facebook.com')) {
        url = null;
      }
    }

    return allPosts;
  }

  /**
   * Get user's photos
   */
  async getUserPhotos(limit = 100): Promise<FacebookPhoto[]> {
    const allPhotos: FacebookPhoto[] = [];
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const initialUrl = new URL(`${this.baseUrl}/me/photos/uploaded`);
    initialUrl.searchParams.set('fields', 'id,name,created_time,picture,images');
    initialUrl.searchParams.set('limit', safeLimit.toString());
    initialUrl.searchParams.set('access_token', this.accessToken);

    let url: string | null = initialUrl.toString();

    while (url) {
      const response: Response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
      }

      const data: { data?: FacebookPhoto[]; paging?: { next?: string } } = await response.json();
      if (Array.isArray(data.data)) {
        allPhotos.push(...data.data);
      }

      url = data.paging?.next || null;
      if (url && !url.startsWith('https://graph.facebook.com')) {
        url = null;
      }
    }

    return allPhotos;
  }

  /**
   * Get user's photo albums
   */
  async getPhotoAlbums(): Promise<unknown[]> {
    const url = new URL(`${this.baseUrl}/me/albums`);
    url.searchParams.set('fields', 'id,name,count,created_time,cover_photo');
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Get friends list
   */
  async getFriends(): Promise<unknown[]> {
    const url = new URL(`${this.baseUrl}/me/friends`);
    url.searchParams.set('fields', 'id,name,picture');
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Get user's videos
   */
  async getUserVideos(limit = 100): Promise<unknown[]> {
    const allVideos: unknown[] = [];
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const initialUrl = new URL(`${this.baseUrl}/me/videos/uploaded`);
    initialUrl.searchParams.set('fields', 'id,title,description,created_time,source,length');
    initialUrl.searchParams.set('limit', safeLimit.toString());
    initialUrl.searchParams.set('access_token', this.accessToken);

    let url: string | null = initialUrl.toString();

    while (url) {
      const response: Response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
      }

      const data: { data?: unknown[]; paging?: { next?: string } } = await response.json();
      if (Array.isArray(data.data)) {
        allVideos.push(...data.data);
      }

      url = data.paging?.next || null;
      if (url && !url.startsWith('https://graph.facebook.com')) {
        url = null;
      }
    }

    return allVideos;
  }

  /**
   * Get groups user is in
   */
  async getUserGroups(): Promise<unknown[]> {
    const url = new URL(`${this.baseUrl}/me/groups`);
    url.searchParams.set('fields', 'id,name,description,member_count');
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Get events user is attending
   */
  async getUserEvents(): Promise<unknown[]> {
    const url = new URL(`${this.baseUrl}/me/events`);
    url.searchParams.set('fields', 'id,name,description,start_time,place');
    url.searchParams.set('access_token', this.accessToken);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Facebook API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Download media file
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    const parsedUrl = new URL(mediaUrl);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Strict host validation to prevent subdomain bypass attacks
    const allowedHostPatterns = [
      /^([a-z0-9-]+\.)*facebook\.com$/,
      /^([a-z0-9-]+\.)*fbcdn\.net$/,
      /^([a-z0-9-]+\.)*fb\.com$/,
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
   * Complete backup workflow
   */
  async backupAllData(
    selectedTypes: string[],
    onProgress?: (progress: number, status: string) => void
  ): Promise<FacebookBackup> {
    const backup: FacebookBackup = {
      profile: null,
      posts: [],
      photos: [],
      albums: [],
      videos: [],
      friends: [],
      groups: [],
      events: [],
      downloadedFiles: []
    };

    try {
      let currentProgress = 0;
      const typeCount = selectedTypes.length || 1;
      const progressPerType = 80 / typeCount;

      if (onProgress) onProgress(5, 'Fetching profile information...');
      backup.profile = await this.getUserProfile();

      for (const type of selectedTypes) {
        switch (type) {
          case 'posts':
            if (onProgress) onProgress(currentProgress, 'Fetching posts...');
            backup.posts = await this.getUserPosts();
            break;

          case 'photos':
            if (onProgress) onProgress(currentProgress, 'Fetching photos...');
            backup.photos = await this.getUserPhotos();
            backup.albums = await this.getPhotoAlbums();

            const totalPhotos = backup.photos.length;
            for (let i = 0; i < totalPhotos; i++) {
              const photo = backup.photos[i];
              try {
                const highestRes = photo.images[0];
                if (highestRes?.source) {
                  const fileData = await this.downloadMedia(highestRes.source);
                  const safeId = photo.id.replace(/[^a-zA-Z0-9_-]/g, '');
                  backup.downloadedFiles.push({
                    id: photo.id,
                    type: 'photo',
                    filename: `photo_${safeId}.jpg`,
                    data: fileData
                  });
                }
              } catch (error) {
                console.error(`Failed to download photo ${photo.id}:`, error);
              }
            }
            break;

          case 'videos':
            if (onProgress) onProgress(currentProgress, 'Fetching videos...');
            backup.videos = await this.getUserVideos();

            // Download actual video files
            for (let i = 0; i < backup.videos.length; i++) {
              const video = backup.videos[i] as { id?: string; source?: string };
              try {
                if (video.source) {
                  const fileData = await this.downloadMedia(video.source);
                  const safeId = (video.id || String(i)).replace(/[^a-zA-Z0-9_-]/g, '');
                  backup.downloadedFiles.push({
                    id: video.id || String(i),
                    type: 'video',
                    filename: `video_${safeId}.mp4`,
                    data: fileData
                  });
                }
              } catch (error) {
                console.error(`Failed to download video ${video.id}:`, error);
              }

              if (onProgress && backup.videos.length > 0) {
                const videoProgress = currentProgress + (progressPerType * (i + 1) / backup.videos.length * 0.5);
                onProgress(videoProgress, `Downloading video ${i + 1} of ${backup.videos.length}...`);
              }
            }
            break;

          case 'friends':
            if (onProgress) onProgress(currentProgress, 'Fetching friends list...');
            backup.friends = await this.getFriends();
            break;

          case 'groups':
            if (onProgress) onProgress(currentProgress, 'Fetching groups...');
            backup.groups = await this.getUserGroups();
            break;

          case 'events':
            if (onProgress) onProgress(currentProgress, 'Fetching events...');
            backup.events = await this.getUserEvents();
            break;
        }

        currentProgress += progressPerType;
        if (onProgress) onProgress(currentProgress, `Completed ${type} backup...`);
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
export async function createFacebookArchive(backup: FacebookBackup): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    archive.append(JSON.stringify(backup.profile, null, 2), {
      name: 'profile.json'
    });

    if (backup.posts.length > 0) {
      archive.append(JSON.stringify(backup.posts, null, 2), {
        name: 'posts.json'
      });
    }

    if (backup.photos.length > 0) {
      archive.append(JSON.stringify(backup.photos, null, 2), {
        name: 'photos.json'
      });
      archive.append(JSON.stringify(backup.albums, null, 2), {
        name: 'photo_albums.json'
      });
    }

    if (backup.videos.length > 0) {
      archive.append(JSON.stringify(backup.videos, null, 2), {
        name: 'videos.json'
      });
    }

    if (backup.friends.length > 0) {
      archive.append(JSON.stringify(backup.friends, null, 2), {
        name: 'friends.json'
      });
    }

    if (backup.groups.length > 0) {
      archive.append(JSON.stringify(backup.groups, null, 2), {
        name: 'groups.json'
      });
    }

    if (backup.events.length > 0) {
      archive.append(JSON.stringify(backup.events, null, 2), {
        name: 'events.json'
      });
    }

    for (const file of backup.downloadedFiles) {
      archive.append(file.data, {
        name: `${file.type}s/${file.filename}`
      });
    }

    const readme = `
# Your Facebook Backup

Generated: ${new Date().toISOString()}
Name: ${backup.profile?.name || 'Unknown'}

## Contents

- profile.json: Your profile information
- posts.json: All your posts and status updates
- photos.json: Photo metadata
- photo_albums.json: Your photo albums
- photos/: Downloaded photos
- videos.json: Video metadata
- videos/: Downloaded video files
- friends.json: Your friends list
- groups.json: Groups you're in
- events.json: Events you've attended or created

## File Format

All files are in standard formats:
- Photos: JPEG
- Data: JSON

You can view these files with any standard viewer and text editor.
    `.trim();

    archive.append(readme, { name: 'README.txt' });

    archive.finalize();
  });
}
