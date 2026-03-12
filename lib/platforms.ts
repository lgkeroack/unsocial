export interface DataType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface LimitationBanner {
  dataTypeId: string;
  severity: 'info' | 'warning';
  message: string;
  officialToolUrl?: string;
  officialToolName?: string;
}

export interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  deletionURL: string;
  dataTypes: DataType[];
  limitationBanners: LimitationBanner[];
  prompts: {
    welcome: string;
    authButton: string;
    authInProgress: string;
    dataSelection: string;
    backupStarting: string;
    backupProgress: string;
    backupComplete: string;
    downloadReady: string;
    deletionWarning: string;
    deletionInstructions: string;
    complete: string;
  };
  deletionSteps: string[];
  limitations: string[];
}

const platforms: Platform[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: 'from-pink-500 to-purple-600',
    description: 'Back up your photos, videos, stories, and profile data',
    deletionURL: 'https://www.instagram.com/accounts/remove/request/permanent/',
    dataTypes: [
      { id: 'profile', name: 'Profile Information', description: 'Your bio, profile picture, and account details', icon: '👤' },
      { id: 'posts', name: 'Posts & Photos', description: 'All your photos and videos with captions', icon: '📷' },
      { id: 'stories', name: 'Stories Archive', description: 'Your saved stories and highlights', icon: '⏱️' },
      { id: 'reels', name: 'Reels', description: 'Your short-form videos', icon: '🎬' },
      { id: 'messages', name: 'Direct Messages', description: 'Your private conversations', icon: '💬' },
      { id: 'followers', name: 'Followers & Following', description: 'Your social connections', icon: '👥' },
    ],
    limitationBanners: [
      {
        dataTypeId: 'messages',
        severity: 'warning',
        message: 'Direct messages are not available through the Instagram API. Use the official data download tool to get your DMs.',
        officialToolUrl: 'https://www.instagram.com/download/request/',
        officialToolName: 'Instagram Data Download',
      },
      {
        dataTypeId: 'followers',
        severity: 'warning',
        message: 'Follower/following lists require an Instagram Business or Creator account.',
      },
      {
        dataTypeId: 'stories',
        severity: 'info',
        message: 'Only stories saved to highlights are available via API. For expired stories, use the official download tool.',
        officialToolUrl: 'https://www.instagram.com/download/request/',
        officialToolName: 'Instagram Data Download',
      },
    ],
    prompts: {
      welcome: "We'll help you safely back up all your Instagram memories before you go. Your photos, videos, stories, and messages - everything will be preserved in standard formats you can keep forever.",
      authButton: 'Connect Instagram Account',
      authInProgress: 'Connecting to Instagram...',
      dataSelection: 'Select which data you want to back up. We recommend backing up everything to ensure you have all your memories.',
      backupStarting: 'Starting your Instagram backup...',
      backupProgress: 'Downloading your Instagram data. This may take a few minutes depending on how much content you have.',
      backupComplete: 'Your Instagram backup is complete! All your data has been packaged into a downloadable archive.',
      downloadReady: 'Your backup archive is ready. Click below to download your Instagram data.',
      deletionWarning: 'Before you delete your Instagram account, make sure you have downloaded and verified your backup. Account deletion is permanent and cannot be undone.',
      deletionInstructions: "Click the button below to open Instagram's account deletion page. You'll need to log in and confirm your decision.",
      complete: "You've successfully backed up your Instagram data. Your memories are safe. If you've deleted your account, it may take up to 30 days to fully process.",
    },
    deletionSteps: [
      'Log in to Instagram on the deletion page',
      'Select a reason for leaving (optional)',
      'Re-enter your password to confirm',
      'Click "Delete Account"',
      'Your account will be deactivated for 30 days before permanent deletion',
    ],
    limitations: [
      'Instagram API has limited access - some data may require manual export',
      'For complete data, also request your data at instagram.com/download/request',
      'Stories older than 24 hours are only available if you saved them to highlights',
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '👤',
    color: 'from-blue-500 to-blue-700',
    description: 'Back up your posts, photos, friends list, and memories',
    deletionURL: 'https://www.facebook.com/help/delete_account',
    dataTypes: [
      { id: 'profile', name: 'Profile Information', description: 'Your bio, profile picture, and personal details', icon: '👤' },
      { id: 'posts', name: 'Posts & Status Updates', description: 'Everything you have shared on your timeline', icon: '📝' },
      { id: 'photos', name: 'Photos & Albums', description: 'All your photos organized by album', icon: '📷' },
      { id: 'videos', name: 'Videos', description: 'Videos you have uploaded', icon: '🎥' },
      { id: 'friends', name: 'Friends List', description: 'Your connections on Facebook', icon: '👥' },
      { id: 'messages', name: 'Messages', description: 'Your Messenger conversations', icon: '💬' },
      { id: 'groups', name: 'Groups', description: 'Groups you are a member of', icon: '👥' },
      { id: 'events', name: 'Events', description: 'Events you have attended or created', icon: '📅' },
    ],
    limitationBanners: [
      {
        dataTypeId: 'messages',
        severity: 'warning',
        message: 'Messenger group chat data may be incomplete. For full message history, use Facebook\'s official download tool.',
        officialToolUrl: 'https://www.facebook.com/dyi/',
        officialToolName: 'Download Your Information',
      },
    ],
    prompts: {
      welcome: "We'll help you safely back up your Facebook history before you go. Your posts, photos, friends, and memories - everything will be preserved in standard formats.",
      authButton: 'Connect Facebook Account',
      authInProgress: 'Connecting to Facebook...',
      dataSelection: 'Select which data you want to back up. We recommend selecting all types for a complete backup.',
      backupStarting: 'Starting your Facebook backup...',
      backupProgress: 'Downloading your Facebook data. This may take a while depending on how long you have been on Facebook.',
      backupComplete: 'Your Facebook backup is complete! All selected data has been packaged into a downloadable archive.',
      downloadReady: 'Your backup archive is ready. Click below to download your Facebook data.',
      deletionWarning: 'Before you delete your Facebook account, make sure you have downloaded and verified your backup. Account deletion is permanent after a 30-day grace period.',
      deletionInstructions: "Click the button below to open Facebook's account deletion page. You'll need to confirm your decision.",
      complete: "You've successfully backed up your Facebook data. Your memories are safe. If you've initiated deletion, your account will be recoverable for 30 days.",
    },
    deletionSteps: [
      'Click "Delete Account" on the Facebook deletion page',
      'Enter your password to confirm',
      'Click "Continue" and then "Delete Account"',
      'Your account enters a 30-day deactivation period',
      'After 30 days, your account and data will be permanently deleted',
    ],
    limitations: [
      'Some data may require Facebook\'s official download tool',
      'Messenger data for group chats may be incomplete',
      'Data from third-party apps connected to Facebook is not included',
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    color: 'from-blue-600 to-blue-800',
    description: 'Back up your professional profile, connections, and posts',
    deletionURL: 'https://www.linkedin.com/help/linkedin/answer/63/closing-your-linkedin-account',
    dataTypes: [
      { id: 'profile', name: 'Profile & Resume', description: 'Your work history, education, and skills', icon: '👤' },
      { id: 'connections', name: 'Connections', description: 'Your professional network contacts', icon: '🤝' },
      { id: 'posts', name: 'Posts & Articles', description: 'Content you have shared', icon: '📝' },
      { id: 'messages', name: 'Messages', description: 'Your InMail and conversations', icon: '💬' },
      { id: 'recommendations', name: 'Recommendations', description: 'Recommendations given and received', icon: '⭐' },
      { id: 'applications', name: 'Job Applications', description: 'Your job application history', icon: '📋' },
    ],
    limitationBanners: [
      {
        dataTypeId: 'profile',
        severity: 'info',
        message: 'LinkedIn\'s API provides limited data. For a complete backup including work history, education, skills, and endorsements, request your official data export first.',
        officialToolUrl: 'https://www.linkedin.com/psettings/member-data',
        officialToolName: 'Download your LinkedIn data',
      },
      {
        dataTypeId: 'connections',
        severity: 'warning',
        message: 'Connection names and contact details require LinkedIn\'s official export. The API only provides basic info.',
        officialToolUrl: 'https://www.linkedin.com/psettings/member-data',
        officialToolName: 'Download your LinkedIn data',
      },
      {
        dataTypeId: 'messages',
        severity: 'warning',
        message: 'Full message history is only available via LinkedIn\'s official export. The API cannot access messages.',
        officialToolUrl: 'https://www.linkedin.com/psettings/member-data',
        officialToolName: 'Download your LinkedIn data',
      },
      {
        dataTypeId: 'recommendations',
        severity: 'info',
        message: 'Recommendations (given and received) are only in LinkedIn\'s official export.',
        officialToolUrl: 'https://www.linkedin.com/psettings/member-data',
        officialToolName: 'Download your LinkedIn data',
      },
      {
        dataTypeId: 'applications',
        severity: 'info',
        message: 'Job application history and saved jobs are only in LinkedIn\'s official export.',
        officialToolUrl: 'https://www.linkedin.com/psettings/member-data',
        officialToolName: 'Download your LinkedIn data',
      },
    ],
    prompts: {
      welcome: "We'll help you back up your professional history before you go. Your profile, connections, recommendations, and content - preserved for your records.",
      authButton: 'Connect LinkedIn Account',
      authInProgress: 'Connecting to LinkedIn...',
      dataSelection: 'Select which data you want to back up. Your professional history and connections are valuable - we recommend backing up everything.',
      backupStarting: 'Starting your LinkedIn backup...',
      backupProgress: 'Downloading your LinkedIn data. Your professional history is being preserved.',
      backupComplete: 'Your LinkedIn backup is complete! Your professional data has been packaged into a downloadable archive.',
      downloadReady: 'Your backup archive is ready. Click below to download your LinkedIn data.',
      deletionWarning: 'Before you delete your LinkedIn account, make sure you have downloaded your backup. You may also want to export your connections to maintain professional contacts.',
      deletionInstructions: "Click the button below to learn how to close your LinkedIn account. LinkedIn requires several confirmation steps.",
      complete: "You've successfully backed up your LinkedIn data. Your professional history is preserved. Consider exporting your connections' emails before account deletion.",
    },
    deletionSteps: [
      'First, request your official data export at linkedin.com/psettings/member-data (takes up to 24 hours)',
      'Download the official archive when the email arrives',
      'Go to Settings & Privacy on LinkedIn',
      'Click on "Account preferences"',
      'Scroll down and click "Close account"',
      'Select a reason for leaving',
      'Enter your password and confirm deletion',
    ],
    limitations: [
      'LinkedIn API access is very limited - most data requires the official export',
      'Request your complete data at linkedin.com/psettings/member-data before deleting',
      'The official export includes connections, messages, recommendations, and full profile',
      'Allow up to 24 hours for LinkedIn to prepare your official data archive',
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: 'from-gray-900 to-gray-700',
    description: 'Back up your videos, profile, and social data',
    deletionURL: 'https://support.tiktok.com/en/account-and-privacy/deleting-an-account',
    dataTypes: [
      { id: 'profile', name: 'Profile Information', description: 'Your display name, bio, and profile picture', icon: '👤' },
      { id: 'videos', name: 'Videos', description: 'All your posted videos', icon: '🎬' },
      { id: 'liked_videos', name: 'Liked Videos', description: 'Videos you have liked (limited)', icon: '❤️' },
      { id: 'followers', name: 'Followers', description: 'Your follower count and info', icon: '👥' },
      { id: 'following', name: 'Following', description: 'Accounts you follow', icon: '👥' },
    ],
    limitationBanners: [
      {
        dataTypeId: 'liked_videos',
        severity: 'info',
        message: 'Liked videos data is limited via the TikTok API. Only basic metadata is available.',
      },
      {
        dataTypeId: 'followers',
        severity: 'info',
        message: 'Only follower/following counts are available via API. For full lists, use TikTok\'s official data download.',
        officialToolUrl: 'https://support.tiktok.com/en/account-and-privacy/personalized-ads-and-data/requesting-your-data',
        officialToolName: 'TikTok Data Download',
      },
      {
        dataTypeId: 'following',
        severity: 'info',
        message: 'Only follower/following counts are available via API. For full lists, use TikTok\'s official data download.',
        officialToolUrl: 'https://support.tiktok.com/en/account-and-privacy/personalized-ads-and-data/requesting-your-data',
        officialToolName: 'TikTok Data Download',
      },
    ],
    prompts: {
      welcome: "We'll help you safely back up your TikTok videos and profile data before you go. Your content will be preserved in standard formats you can keep forever.",
      authButton: 'Connect TikTok Account',
      authInProgress: 'Connecting to TikTok...',
      dataSelection: 'Select which data you want to back up. We recommend backing up everything, especially your videos.',
      backupStarting: 'Starting your TikTok backup...',
      backupProgress: 'Downloading your TikTok data. Video downloads may take a while depending on how many you have.',
      backupComplete: 'Your TikTok backup is complete! All your data has been packaged into a downloadable archive.',
      downloadReady: 'Your backup archive is ready. Click below to download your TikTok data.',
      deletionWarning: 'Before you delete your TikTok account, make sure you have downloaded and verified your backup. Account deletion is permanent and cannot be undone.',
      deletionInstructions: "Follow the steps below to delete your TikTok account. You can do this from the TikTok app or website.",
      complete: "You've successfully backed up your TikTok data. Your videos and memories are safe. If you've deleted your account, it may take up to 30 days to fully process.",
    },
    deletionSteps: [
      'Open TikTok and go to your Profile',
      'Tap the menu icon (three lines) and select "Settings and privacy"',
      'Tap "Manage account"',
      'Tap "Delete account"',
      'Follow the on-screen instructions to confirm',
      'Your account will be deactivated for 30 days before permanent deletion',
    ],
    limitations: [
      'TikTok API access is limited - DMs and sounds are not available',
      'For complete data, also request your data through TikTok\'s privacy settings',
      'Liked video details may be limited to basic metadata',
      'Video download quality depends on API availability',
    ],
  },
];

export function getPlatform(id: string): Platform | null {
  return platforms.find(p => p.id === id) || null;
}

export function getAllPlatforms(): Platform[] {
  return platforms;
}

export default platforms;
