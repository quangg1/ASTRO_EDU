/**
 * Hot reload (Fast Refresh) cần:
 * 1) Dev server compile thành công — nếu terminal báo "Failed to compile" / import error,
 *    HMR sẽ không áp dụng; khi đó phải sửa lỗi (hoặc xóa .next rồi chạy lại dev).
 * 2) Trên Windows (ổ mạng, OneDrive, antivirus): có thể bật polling:
 *    PowerShell: $env:WATCHPACK_POLLING="1"; npm run dev
 *    hoặc: npm run dev:poll
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  /** Tutorial Studio cũ → Learning Path Studio */
  async redirects() {
    return [
      { source: '/studio/tutorial', destination: '/studio/learning-path', permanent: false },
      { source: '/studio/tutorial/new', destination: '/studio/learning-path', permanent: false },
      { source: '/studio/tutorial/:slug', destination: '/studio/learning-path', permanent: false },
    ]
  },

  // Proxy /media to Media service (uploads served same-origin)
  async rewrites() {
    const mediaUrl = process.env.MEDIA_SERVICE_URL || 'http://localhost:3004';
    return [{ source: '/media/:path*', destination: `${mediaUrl}/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  
  // Allow images from localhost and from media CDN (S3 / CloudFront)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.cloudfront.net', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
  
  // Transpile three.js packages
  transpilePackages: ['three'],
  
  webpack: (config, { dev, isServer }) => {
    /** Polling khi file watcher của Windows không bắt được sự kiện save (D:, cloud sync, v.v.) */
    if (dev && !isServer && process.env.WATCHPACK_POLLING === '1') {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
};

module.exports = nextConfig;
