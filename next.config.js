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
    optimizeCss: true,
    esmExternals: false,
    turbo: {
      rules: {
        '*.js': ['swc-loader'],
        '*.ts': ['swc-loader'],
        '*.tsx': ['swc-loader'],
      },
    },
    // Edge runtime configuration
    runtime: 'nodejs',
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