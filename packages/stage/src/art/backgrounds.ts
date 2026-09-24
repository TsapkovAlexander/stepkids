import { INK } from './palette';

/** Free-scene backgrounds, 480×360 like the Scratch stage. */
export const BACKGROUNDS = [
  { id: 'park', label: 'Парк' },
  { id: 'space', label: 'Космос' },
  { id: 'ocean', label: 'Море' },
  { id: 'city', label: 'Город' },
  { id: 'room', label: 'Комната' },
] as const;

const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360">${body}</svg>`;

function stars(count: number, seed: number): string {
  let s = seed;
  const next = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, () => {
    const r = 1 + next() * 2.2;
    return `<circle cx="${(next() * 480).toFixed(0)}" cy="${(next() * 300).toFixed(0)}" r="${r.toFixed(1)}" fill="#fff" opacity="${(0.5 + next() * 0.5).toFixed(2)}"/>`;
  }).join('');
}

export function backgroundSvg(id: string): string {
  switch (id) {
    case 'space':
      return wrap(
        `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1b4b"/><stop offset="1" stop-color="#3b2a6b"/></linearGradient></defs>` +
          `<rect width="480" height="360" fill="url(#g)"/>` +
          stars(70, 7) +
          `<circle cx="400" cy="70" r="34" fill="#fff4b0" stroke="${INK}" stroke-width="3"/><circle cx="388" cy="60" r="6" fill="#f0dc86"/><circle cx="410" cy="84" r="4" fill="#f0dc86"/>`,
      );
    case 'ocean':
      return wrap(
        `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd6ff"/><stop offset="1" stop-color="#2a7fcf"/></linearGradient></defs>` +
          `<rect width="480" height="360" fill="url(#g)"/>` +
          `<path d="M0 320 C80 300 160 330 240 314 C320 298 400 326 480 310 L480 360 L0 360 Z" fill="#f3d99b" stroke="${INK}" stroke-width="3"/>` +
          `<path d="M60 320 C50 280 70 260 56 230 M70 320 C84 290 70 270 84 244" fill="none" stroke="#3f9a57" stroke-width="8" stroke-linecap="round"/>` +
          `<path d="M410 316 C400 270 424 250 408 214" fill="none" stroke="#3f9a57" stroke-width="8" stroke-linecap="round"/>` +
          [40, 120, 300, 360, 440]
            .map(
              (x, i) =>
                `<circle cx="${x}" cy="${80 + i * 37}" r="${6 + (i % 3) * 3}" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="3"/>`,
            )
            .join(''),
      );
    case 'city':
      return wrap(
        `<rect width="480" height="360" fill="#cdeeff"/>` +
          `<circle cx="70" cy="60" r="28" fill="#ffe066"/>` +
          [
            [20, 150, 70, '#ffb3c1'],
            [100, 110, 80, '#b8a4ff'],
            [190, 170, 60, '#8ecbff'],
            [260, 90, 90, '#ffd28a'],
            [360, 140, 70, '#9be15d'],
            [440, 120, 60, '#ff9f7a'],
          ]
            .map(
              ([x, top, w, color]) =>
                `<rect x="${x}" y="${top}" width="${w}" height="${280 - Number(top)}" rx="6" fill="${color}" stroke="${INK}" stroke-width="3"/>` +
                Array.from(
                  { length: 4 },
                  (_, row) =>
                    `<rect x="${Number(x) + 12}" y="${Number(top) + 16 + row * 26}" width="14" height="14" rx="3" fill="#fff8d6"/>`,
                ).join(''),
            )
            .join('') +
          `<rect y="280" width="480" height="80" fill="#6f7b88"/><path d="M0 320 H480" stroke="#fff" stroke-width="6" stroke-dasharray="30 24"/>`,
      );
    case 'room':
      return wrap(
        `<rect width="480" height="260" fill="#ffe3c2"/><rect y="260" width="480" height="100" fill="#c58a5c"/>` +
          `<path d="M0 260 H480" stroke="${INK}" stroke-width="3"/>` +
          `<rect x="170" y="50" width="140" height="110" rx="8" fill="#bfeaff" stroke="${INK}" stroke-width="4"/><path d="M240 50 V160 M170 105 H310" stroke="${INK}" stroke-width="4"/>` +
          `<rect x="30" y="170" width="90" height="90" rx="8" fill="#ff8fc2" stroke="${INK}" stroke-width="3"/>` +
          `<circle cx="400" cy="200" r="36" fill="#62c46a" stroke="${INK}" stroke-width="3"/><rect x="390" y="230" width="20" height="30" fill="#a86b43" stroke="${INK}" stroke-width="3"/>`,
      );
    default:
      return wrap(
        `<rect width="480" height="360" fill="#d8f1ff"/>` +
          `<circle cx="410" cy="60" r="32" fill="#ffe066"/>` +
          `<path d="M60 70 a20 20 0 0 1 36 -8 a16 16 0 0 1 28 12 a14 14 0 0 1 -4 26 h-56 a16 16 0 0 1 -4 -30 Z" fill="#fff"/>` +
          `<path d="M0 250 C100 200 200 230 280 215 C360 200 420 220 480 210 L480 360 L0 360 Z" fill="#a4dc79" stroke="${INK}" stroke-width="3"/>` +
          `<path d="M0 300 C120 270 260 300 480 280 L480 360 L0 360 Z" fill="#8cc760"/>`,
      );
  }
}
