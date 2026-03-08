/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

const corsHeaders = [
  {
    key: 'Access-Control-Allow-Origin',
    value: process.env.NEXTAUTH_URL || 'http://localhost:3000'
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET, POST, OPTIONS'
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: 'Content-Type, Authorization'
  },
  {
    key: 'Access-Control-Max-Age',
    value: '86400'
  }
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: corsHeaders,
      },
    ];
  },
}

module.exports = nextConfig
