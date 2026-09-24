import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Шаг за шагом',
    short_name: 'Шаг за шагом',
    description: 'Детский конструктор программирования',
    start_url: '/play',
    display: 'standalone',
    orientation: 'any',
    background_color: '#dff4ff',
    theme_color: '#dff4ff',
    lang: 'ru',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
