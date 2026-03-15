/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Proxy /media to Media service (uploads served same-origin)
  async rewrites() {
    const mediaUrl = process.env.MEDIA_SERVICE_URL || 'http://localhost:3004';
    return [{ source: '/media/:path*', destination: `${mediaUrl}/:path*` }];
  },
  
  // Allow images from external sources
  images: {
    domains: ['localhost'],
  },
  
  // Transpile three.js packages
  transpilePackages: ['three'],
  
  // Webpack configuration for Three.js
  webpack: (config) => {
    config.externals = config.externals || [];
    return config;
  },
};

module.exports = nextConfig;
