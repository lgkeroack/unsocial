/**
 * LinkedIn API Client
 *
 * Handles data extraction from LinkedIn using the LinkedIn API v2.
 * Note: LinkedIn API has limited access. For comprehensive data,
 * users should use LinkedIn's "Request archive of your data" feature.
 */

import archiver from 'archiver';

interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  profilePicture?: unknown;
  vanityName?: string;
}

interface LinkedInPost {
  id: string;
  author: string;
  created: number;
  text?: string;
  commentary?: string;
}

interface LinkedInBackup {
  profile: LinkedInProfile | null;
  email: string | null;
  posts: LinkedInPost[];
  manualArchiveRequired: boolean;
  manualArchiveUrl: string;
}

export class LinkedInAPI {
  private accessToken: string;
  private baseUrl = 'https://api.linkedin.com/v2';

  constructor(accessToken: string) {
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error('Invalid access token');
    }
    this.accessToken = accessToken;
  }

  /**
   * Make authenticated request to LinkedIn API
   */
  private async makeRequest(endpoint: string): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get user profile information
   */
  async getUserProfile(): Promise<LinkedInProfile> {
    const data = await this.makeRequest('/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))') as {
      id: string;
      firstName: { localized: { en_US: string } };
      lastName: { localized: { en_US: string } };
      profilePicture?: unknown;
    };

    return {
      id: data.id,
      firstName: data.firstName?.localized?.en_US || '',
      lastName: data.lastName?.localized?.en_US || '',
      profilePicture: data.profilePicture
    };
  }

  /**
   * Get user's email address
   */
  async getUserEmail(): Promise<string> {
    const data = await this.makeRequest('/emailAddress?q=members&projection=(elements*(handle~))') as {
      elements?: Array<{ 'handle~': { emailAddress: string } }>;
    };

    if (data.elements && data.elements.length > 0) {
      return data.elements[0]['handle~'].emailAddress;
    }

    throw new Error('Email not found');
  }

  /**
   * Get user's posts (shares)
   * Note: This endpoint has limited data compared to the full LinkedIn experience
   */
  async getUserPosts(count = 100): Promise<LinkedInPost[]> {
    try {
      const personId = await this.getPersonId();
      const safeCount = Math.min(Math.max(1, count), 100);

      const data = await this.makeRequest(`/shares?q=owners&owners=urn:li:person:${encodeURIComponent(personId)}&count=${safeCount}`) as {
        elements?: Array<{
          id: string;
          owner: string;
          created: { time: number };
          text?: { text: string };
          commentary?: string;
        }>;
      };

      return (data.elements || []).map((share) => ({
        id: share.id,
        author: share.owner,
        created: share.created.time,
        text: share.text?.text,
        commentary: share.commentary
      }));
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      return [];
    }
  }

  /**
   * Get person ID (required for some endpoints)
   */
  private async getPersonId(): Promise<string> {
    const profile = await this.getUserProfile();
    return profile.id;
  }

  /**
   * Request data archive from LinkedIn
   * Note: LinkedIn doesn't provide API for this - users must request manually
   */
  async requestDataArchive(): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: 'Data archive must be requested manually at linkedin.com/psettings/member-data'
    };
  }

  /**
   * Complete backup workflow
   */
  async backupAllData(
    selectedTypes: string[],
    onProgress?: (progress: number, status: string) => void
  ): Promise<LinkedInBackup> {
    const backup: LinkedInBackup = {
      profile: null,
      email: null,
      posts: [],
      manualArchiveRequired: true,
      manualArchiveUrl: 'https://www.linkedin.com/psettings/member-data'
    };

    try {
      if (onProgress) onProgress(20, 'Fetching profile information...');
      backup.profile = await this.getUserProfile();

      if (onProgress) onProgress(40, 'Fetching email address...');
      try {
        backup.email = await this.getUserEmail();
      } catch (error) {
        console.error('Failed to fetch email:', error);
      }

      if (selectedTypes.includes('posts')) {
        if (onProgress) onProgress(60, 'Fetching posts and articles...');
        backup.posts = await this.getUserPosts();
      }

      if (onProgress) onProgress(100, 'API backup complete!');
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
export async function createLinkedInArchive(backup: LinkedInBackup): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    archive.append(JSON.stringify(backup.profile, null, 2), {
      name: 'profile.json'
    });

    if (backup.email) {
      archive.append(JSON.stringify({ email: backup.email }, null, 2), {
        name: 'email.json'
      });
    }

    if (backup.posts.length > 0) {
      archive.append(JSON.stringify(backup.posts, null, 2), {
        name: 'posts.json'
      });
    }

    const readme = `
# Your LinkedIn Backup

Generated: ${new Date().toISOString()}
Name: ${backup.profile?.firstName || ''} ${backup.profile?.lastName || ''}

## IMPORTANT: Complete Your Backup

This archive contains LIMITED data from the LinkedIn API. For a COMPLETE backup, you MUST:

1. Go to: https://www.linkedin.com/psettings/member-data
2. Click "Request archive"
3. Wait for LinkedIn to email you (usually 24 hours)
4. Download the complete archive from the email

The official LinkedIn archive includes:
- Complete profile with work history, education, skills
- All connections with contact information
- All messages and conversations
- All posts, articles, and comments
- Recommendations given and received
- Skill endorsements
- Job applications and saved jobs
- Learning courses completed
- And much more

## What's in This Archive

This API-based backup includes only:
- profile.json: Basic profile information (name, headline)
- email.json: Your email address
- posts.json: Recent posts (limited data)

## Why the Limitation?

LinkedIn's API has restricted access since 2019. Most user data is only available
through the official "Download Your Data" feature for privacy and security reasons.

## Next Steps

1. Request your official LinkedIn archive (link above)
2. Download when ready (usually within 24 hours)
3. Keep both archives together for complete records
4. Then proceed with account deletion if desired
    `.trim();

    archive.append(readme, { name: 'README.txt' });

    const instructions = `
# How to Get Your Complete LinkedIn Data

Step 1: Visit LinkedIn Settings
Go to: https://www.linkedin.com/psettings/member-data

Step 2: Request Your Archive
- Click "Request archive" button
- LinkedIn will start preparing your data
- You'll receive an email when ready (usually 24 hours)

Step 3: Download Your Archive
- Check your email from LinkedIn
- Click the download link
- Save the file to a safe location

Step 4: Combine with This Archive
- Keep both archives together
- The official archive is MUCH more comprehensive
- This API archive is just a small supplement

The official archive will be a .ZIP file containing:
- Profile.csv - Complete work history, education
- Connections.csv - All your connections
- Messages.csv - All conversations
- Recommendations_Given.csv & Recommendations_Received.csv
- Endorsement_Given.csv & Endorsement_Received.csv
- And many more files...

DO NOT delete your LinkedIn account until you have downloaded
the official archive!
    `.trim();

    archive.append(instructions, { name: 'INSTRUCTIONS.txt' });

    archive.finalize();
  });
}

/**
 * Get comprehensive LinkedIn backup instructions for the user
 */
export function getLinkedInBackupInstructions(): string {
  return `
LinkedIn API Access is Limited

The LinkedIn API provides only basic profile information. For a complete backup of your LinkedIn data, you need to use LinkedIn's official "Request archive of your data" feature.

Here's how to get your complete LinkedIn backup:

1. **Visit LinkedIn Data Settings**
   Go to: https://www.linkedin.com/psettings/member-data
   (Or: Settings & Privacy -> Data Privacy -> Get a copy of your data)

2. **Request Your Archive**
   - Select "Want something more specific? Select the data files you're most interested in"
   - Check all boxes to get everything:
     * Profile
     * Connections
     * Messages
     * Posts
     * Recommendations
     * And more
   - Click "Request archive"

3. **Wait for Email**
   - LinkedIn will prepare your data
   - You'll receive an email within 24 hours
   - Sometimes it arrives in just a few hours

4. **Download Your Complete Archive**
   - Check your email from LinkedIn
   - Click the secure download link
   - Save the .ZIP file to a safe location
   - This archive is COMPLETE - it has everything

5. **What You'll Get**
   Your official archive includes:
   - Complete profile with all work history and education
   - Full connections list with contact info
   - All messages and conversations
   - All your posts, articles, and comments
   - Recommendations (given and received)
   - Skill endorsements
   - Job applications
   - And much more in CSV and PDF format

**After You Download:**
- Keep the archive in a safe place
- Extract the ZIP to browse your data
- Only then proceed with account deletion

**Important:** Do NOT delete your LinkedIn account until you have successfully downloaded the official archive!
  `.trim();
}
