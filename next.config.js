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

  // Configure middleware to run on edge runtime
  experimental: {
    middleware: true,
  },

  // Optimize CSS
  optimizeFonts: true,

  async rewrites() {
    return [
      {
        source: '/api/po/chat',
        destination: '/api/assistant/chat',
      }
    ];
  },
  
  experimental: {
    esmExternals: false,
    optimizeCss: true,
    turbo: {
      rules: {
        '*.js': ['swc-loader'],
        '*.ts': ['swc-loader'],
        '*.tsx': ['swc-loader'],
      },
    },
  },
};

module.exports = nextConfig;