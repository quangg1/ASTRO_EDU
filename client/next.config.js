/** Tiền tố `/api/...` do unified API (`services/api`) — không gồm route nội bộ Next như `/api/chat`. */
const ENV = require('../shared/envNames');

const UNIFIED_API_ROUTE_SEGMENTS = [
  'courses',
  'tutorials',
  'learning-path',
  'concepts',
  'showcase-entities',
  'showcase-catalog',
  'showcase-orbits',
  'gems',
  'showcase',
  'earth-history',
  'planet-narratives',
  'fossils',
  'phyla',
  'payments',
  'forums',
  'posts',
  'news',
  'admin',
];

function trimEndSlash(s) {
  return String(s || '').trim().replace(/\/$/, '');
}

function readEnv(name) {
  return trimEndSlash(process.env[name] || '');
}

function resolveMediaOrigin() {
  return (
    readEnv(ENV.MEDIA_SERVICE_URL) ||
    readEnv(ENV.NEXT_PUBLIC_API_BASE_URL) ||
    readEnv(ENV.API_PROXY_TARGET)
  );
}

function resolveApiProxyOrigin() {
  return readEnv(ENV.API_PROXY_TARGET) || readEnv(ENV.NEXT_PUBLIC_API_BASE_URL);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],

  async redirects() {
    return [
      { source: '/studio/tutorial', destination: '/studio/learning-path', permanent: false },
      { source: '/studio/tutorial/new', destination: '/studio/learning-path', permanent: false },
      { source: '/studio/tutorial/:slug', destination: '/studio/learning-path', permanent: false },
    ];
  },

  async rewrites() {
    const mediaUrl = resolveMediaOrigin();
    const mediaRule = mediaUrl
      ? { source: '/media/:path*', destination: `${mediaUrl}/:path*` }
      : null;

    if (process.env.NODE_ENV !== 'development') {
      return mediaRule ? [mediaRule] : [];
    }

    const apiOrigin = resolveApiProxyOrigin();
    if (!apiOrigin) {
      return mediaRule ? [mediaRule] : [];
    }

    const apiRules = UNIFIED_API_ROUTE_SEGMENTS.flatMap((segment) => [
      {
        source: `/api/${segment}/:path*`,
        destination: `${apiOrigin}/api/${segment}/:path*`,
      },
      {
        source: `/api/${segment}`,
        destination: `${apiOrigin}/api/${segment}`,
      },
    ]);
    const authRules = [
      { source: '/auth/:path*', destination: `${apiOrigin}/auth/:path*` },
      { source: '/auth', destination: `${apiOrigin}/auth` },
      { source: '/upload/:path*', destination: `${apiOrigin}/upload/:path*` },
      { source: '/upload/avatar', destination: `${apiOrigin}/upload/avatar` },
      { source: '/upload', destination: `${apiOrigin}/upload` },
      { source: '/files/:path*', destination: `${apiOrigin}/files/:path*` },
      { source: '/files', destination: `${apiOrigin}/files` },
    ];
    return mediaRule ? [mediaRule, ...apiRules, ...authRules] : [...apiRules, ...authRules];
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

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com', pathname: '/**' },
      { protocol: 'https', hostname: '**.cloudfront.net', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },

  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer && process.env.WATCHPACK_POLLING === '1') {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
