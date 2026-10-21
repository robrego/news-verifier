import type { MetadataRoute } from 'next';

// A share_target lets Android (and installed web apps) send a link or text straight to Verify News
// from the system share sheet. It needs no server code: the home page reads the query string.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Verify News',
    short_name: 'Verify News',
    description: 'Check a headline, claim or article against live sources.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F9FAFF',
    theme_color: '#F9FAFF',
    icons: [{ src: '/icon.png', sizes: 'any', type: 'image/png' }],
    share_target: {
      action: '/',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    },
  } as MetadataRoute.Manifest;
}
