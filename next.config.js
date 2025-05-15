/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'xhdcccmzciblpbrcrnii.supabase.co']
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['pandatravelog.netlify.app']
    }
  }
};

module.exports = nextConfig;
