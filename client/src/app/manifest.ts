import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cosmo Learn',
    short_name: 'CosmoLearn',
    description:
      'Learn astronomy through courses, tutorials, and 3D simulations.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#0a0f17',
    orientation: 'portrait',
    icons: [
      {
        src: '/images/web_icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/images/web_icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/images/web_icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
