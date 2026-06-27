import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const buildHash = process.env.GITHUB_SHA?.slice(0, 7) || Date.now().toString(36);

export default defineConfig({
  base: '/game-trailhead/',
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Trailhead',
        short_name: 'Trailhead',
        description: 'A Hidato and Numbrix path-completion puzzle for mobile and iPad.',
        theme_color: '#1a2e1a',
        background_color: '#1a2e1a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/game-trailhead/',
        scope: '/game-trailhead/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        globIgnores: ['**/puzzles/**'],
        navigateFallback: '/game-trailhead/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) =>
              url.pathname.includes('/puzzles/') && url.pathname.endsWith('.json'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'puzzle-banks',
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
});
