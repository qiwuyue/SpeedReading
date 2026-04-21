import { describe, expect, it } from 'vitest'

import manifest from './manifest'

describe('manifest', () => {
  it('returns the expected PWA metadata', () => {
    const result = manifest()

    expect(result).toMatchObject({
      name: 'Next.js PWA',
      short_name: 'NextPWA',
      description: 'A Progressive Web App built with Next.js',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#000000',
    })

    expect(result.icons).toEqual([
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ])
  })
})
