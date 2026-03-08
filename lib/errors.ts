export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_TOKEN_EXPIRED'
  | 'BACKUP_ALREADY_RUNNING'
  | 'BACKUP_START_FAILED'
  | 'BACKUP_NOT_FOUND'
  | 'PLATFORM_RATE_LIMITED'
  | 'PLATFORM_TOKEN_REVOKED'
  | 'ARCHIVE_NOT_FOUND'
  | 'ARCHIVE_EXPIRED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_INPUT'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

interface ErrorInfo {
  message: string;
  suggestion: string;
  status: number;
}

const ERROR_MAP: Record<ErrorCode, ErrorInfo> = {
  AUTH_REQUIRED: {
    message: 'You must be logged in to perform this action.',
    suggestion: 'Please sign in with your social media account.',
    status: 401,
  },
  AUTH_TOKEN_EXPIRED: {
    message: 'Your session has expired.',
    suggestion: 'Please sign in again to continue.',
    status: 401,
  },
  BACKUP_ALREADY_RUNNING: {
    message: 'A backup is already in progress for this platform.',
    suggestion: 'Please wait for the current backup to finish before starting another.',
    status: 409,
  },
  BACKUP_START_FAILED: {
    message: 'Failed to start the backup process.',
    suggestion: 'Please try again in a few minutes. If the problem persists, contact support.',
    status: 500,
  },
  BACKUP_NOT_FOUND: {
    message: 'The requested backup was not found.',
    suggestion: 'The backup may have been deleted or the ID is incorrect.',
    status: 404,
  },
  PLATFORM_RATE_LIMITED: {
    message: 'The platform API rate limit has been reached.',
    suggestion: 'Please wait a few minutes before trying again.',
    status: 429,
  },
  PLATFORM_TOKEN_REVOKED: {
    message: 'Your platform access has been revoked.',
    suggestion: 'Please reconnect your account and try again.',
    status: 401,
  },
  ARCHIVE_NOT_FOUND: {
    message: 'The requested archive was not found.',
    suggestion: 'The archive may have been deleted or the ID is incorrect.',
    status: 404,
  },
  ARCHIVE_EXPIRED: {
    message: 'This archive has expired and is no longer available for download.',
    suggestion: 'You can start a new backup to generate a fresh archive.',
    status: 410,
  },
  RATE_LIMIT_EXCEEDED: {
    message: 'Too many requests. Please slow down.',
    suggestion: 'Wait a moment before trying again.',
    status: 429,
  },
  INVALID_INPUT: {
    message: 'The request contains invalid data.',
    suggestion: 'Please check your input and try again.',
    status: 400,
  },
  INTERNAL_ERROR: {
    message: 'An unexpected error occurred.',
    suggestion: 'Please try again. If the problem persists, contact support.',
    status: 500,
  },
  SERVICE_UNAVAILABLE: {
    message: 'The service is temporarily unavailable.',
    suggestion: 'Please try again in a few minutes.',
    status: 503,
  },
};

export interface AppErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    suggestion: string;
    details?: string;
  };
  status: number;
}

export function createErrorResponse(code: ErrorCode, details?: string): AppErrorResponse {
  const info = ERROR_MAP[code];
  return {
    error: {
      code,
      message: info.message,
      suggestion: info.suggestion,
      ...(details ? { details } : {}),
    },
    status: info.status,
  };
}
