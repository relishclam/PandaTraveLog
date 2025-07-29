/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Optimize chunk loading
  output: 'standalone',
  poweredByHeader: false,
  
  // Improve page loading strategy
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Optimize image loading
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Optimize CSS and fonts
  optimizeFonts: true,

  // All experimental features consolidated
  experimental: {
    esmExternals: true,
    serverActions: true,
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },

  // Enable SWC minification for better performance
  swcMinify: true,

  // Configure compiler options
  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Headers to improve caching and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },

  // API rewrites
  async rewrites() {
    return [
      {
        source: '/api/po/chat',
        destination: '/api/assistant/chat',
      }
    ];
  },
};

module.exports = nextConfig;