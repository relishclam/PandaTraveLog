// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output mode for better compatibility with Netlify
  output: 'standalone',
  
  // Configure image domains if you have any external images
  images: {
    unoptimized: true, // Required when using 'export'
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Disable React strict mode during development if needed
  reactStrictMode: true,

  // Add Content Security Policy
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              img-src 'self' blob: data: https://*;
              font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;
              connect-src 'self' 
                https://api.geoapify.com 
                https://*.supabase.co 
                https://*.googleapis.com
                https://generativelanguage.googleapis.com  
                https://*.google.ai;
              frame-src 'self';
              object-src 'none';
            `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;