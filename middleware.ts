import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const config = {
  matcher: '/api/:path*',
};

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function getRateLimitConfig(pathname: string): { name: string; config: typeof RATE_LIMITS[keyof typeof RATE_LIMITS] } | null {
  if (pathname.startsWith('/api/backup/start')) {
    return { name: 'backupStart', config: RATE_LIMITS.backupStart };
  }
  if (pathname.match(/^\/api\/backup\/status\//)) {
    return { name: 'statusPoll', config: RATE_LIMITS.statusPoll };
  }
  if (pathname.startsWith('/api/download/')) {
    return { name: 'download', config: RATE_LIMITS.download };
  }
  return { name: 'general', config: RATE_LIMITS.general };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip NextAuth routes
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Request size validation for POST requests
  if (request.method === 'POST') {
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Request body too large', suggestion: 'Maximum request size is 1MB.' } },
        { status: 413 }
      );
    }

    const contentType = request.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Unsupported content type', suggestion: 'Use application/json.' } },
        { status: 415 }
      );
    }
  }

  // Rate limiting
  const clientIp = getClientIp(request);
  const limitConfig = getRateLimitConfig(pathname);

  if (limitConfig) {
    const result = checkRateLimit(limitConfig.name, clientIp, limitConfig.config);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please slow down.',
            suggestion: `Try again in ${result.retryAfter} seconds.`,
          },
        },
        {
          status: 429,
          headers: { 'Retry-After': result.retryAfter.toString() },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    return response;
  }

  return NextResponse.next();
}
