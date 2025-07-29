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
    optimizeCss: false, // Disable CSS optimization which can cause issues
    esmExternals: true, // Enable proper ESM handling
    serverActions: true,
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
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