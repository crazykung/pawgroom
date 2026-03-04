/** @type {import('next').NextConfig} */
const nextConfig = {
  // เปิด standalone output สำหรับ Docker
  output: 'standalone',

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: process.env.NEXT_PUBLIC_DOMAIN || 'yourdomain.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Environment variables ที่ FE เข้าถึงได้
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },

  // Headers security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
    ]
  },

  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
}

module.exports = nextConfig
