import { NextRequest } from 'next/server';

/**
 * Extract client IP address from request headers.
 * Checks x-forwarded-for (common with proxies/load balancers) and x-real-ip.
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
