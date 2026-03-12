/**
 * Shared constants and validation patterns
 */

export const PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  SAFE_ID: /^[a-zA-Z0-9_-]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
};

export const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'tiktok'] as const;
export type PlatformType = typeof PLATFORMS[number];

export const PLATFORM_NAMES: Record<PlatformType, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
};

/**
 * Validates if a string is a valid UUID v4
 */
export function isValidUUID(id: string): boolean {
  return PATTERNS.UUID.test(id);
}

/**
 * Validates if a string is a valid email address
 */
export function isValidEmail(email: string): boolean {
  return PATTERNS.EMAIL.test(email);
}

/**
 * Validates if a string contains only safe characters for IDs
 */
export function isValidSafeId(id: string): boolean {
  return PATTERNS.SAFE_ID.test(id);
}

/**
 * Sanitizes a string to only contain safe characters
 */
export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}
