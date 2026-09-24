import type { ItemColor } from '@stepkids/blocks';
import { INK, ITEM_COLOR_HEX, type ThemePalette } from './palette';

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

/** Archimedean spiral as a polyline path — for lollipops and portals. */
function spiralPath(cx: number, cy: number, radius: number, turns = 2.4): string {
  const points: string[] = [];
  const steps = 60;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = t * turns * Math.PI * 2;
    const r = t * radius;
    points.push(
      `${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`,
    );
  }
  return `M${points.join(' L')}`;
}

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(
      `${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`,
    );
  }
  return `M${points.join(' L')} Z`;
}

export function starSvg(): string {
  return svg(
    `<path d="${starPath(50, 54, 40, 19)}" fill="#ffd84d" stroke="#d98a12" stroke-width="4"/>` +
      `<path d="${starPath(50, 54, 29, 13)}" fill="#ffe98a"/>` +
      `<ellipse cx="43" cy="54" rx="2.8" ry="3.6" fill="${INK}"/>` +
      `<ellipse cx="57" cy="54" rx="2.8" ry="3.6" fill="${INK}"/>` +
      `<path d="M46 61 q4 3.5 8 0" fill="none" stroke="${INK}" stroke-width="2.2"/>` +
      `<ellipse cx="38" cy="60" rx="3.4" ry="2" fill="#ff9f7a" opacity="0.55"/>` +
      `<ellipse cx="62" cy="60" rx="3.4" ry="2" fill="#ff9f7a" opacity="0.55"/>` +
      `<path d="M38 32 q3 -6 8 -7" fill="none" stroke="#fff" stroke-width="3" opacity="0.8"/>`,
  );
}

export function rockSvg(): string {
  return svg(
    `<ellipse cx="50" cy="86" rx="36" ry="7" fill="#000" opacity="0.12"/>` +
      `<path d="M14 82 C10 60 22 38 44 34 C64 30 86 44 88 66 C89 78 84 86 74 86 L24 86 C18 86 15 85 14 82 Z" fill="#a3a9b8" stroke="${INK}" stroke-width="3.4"/>` +
      `<path d="M26 60 C28 50 36 44 46 43" fill="none" stroke="#dfe3ec" stroke-width="4"/>` +
      `<path d="M60 70 l10 -6 M52 78 l7 -2" stroke="#7d8394" stroke-width="3"/>` +
      `<path d="M58 36 C66 30 78 36 80 44 C72 42 64 42 58 36 Z" fill="#8cc760" stroke="${INK}" stroke-width="2.4"/>`,
  );
}

export function treeSvg(kind: ThemePalette['tree']): string {
  const shadow = `<ellipse cx="50" cy="90" rx="30" ry="6" fill="#000" opacity="0.12"/>`;
  const trunk = `<rect x="43" y="62" width="14" height="28" rx="4" fill="#a86b43" stroke="${INK}" stroke-width="3"/>`;
  switch (kind) {
    case 'pine':
      return svg(
        shadow +
          `<rect x="44" y="72" width="12" height="18" rx="3" fill="#a86b43" stroke="${INK}" stroke-width="3"/>` +
          `<path d="M50 6 L78 44 L66 44 L84 72 L16 72 L34 44 L22 44 Z" fill="#3f9a57" stroke="${INK}" stroke-width="3.2"/>` +
          `<path d="M50 16 L64 36 M44 50 L36 62" stroke="#6cc47f" stroke-width="3.4"/>`,
      );
    case 'palm':
      return svg(
        shadow +
          `<path d="M48 90 C46 70 50 52 56 36" fill="none" stroke="${INK}" stroke-width="10"/>` +
          `<path d="M48 90 C46 70 50 52 56 36" fill="none" stroke="#b9854f" stroke-width="6"/>` +
          `<path d="M56 34 C40 20 22 24 14 36 C30 30 44 32 56 36 C70 22 86 24 92 36 C78 30 66 32 56 36 C58 20 50 10 38 8 C48 16 54 26 56 34 Z" fill="#4fb36a" stroke="${INK}" stroke-width="3"/>`,
      );
    case 'snowy':
      return svg(
        shadow +
          `<rect x="44" y="72" width="12" height="18" rx="3" fill="#a86b43" stroke="${INK}" stroke-width="3"/>` +
          `<path d="M50 6 L78 44 L66 44 L84 72 L16 72 L34 44 L22 44 Z" fill="#4c9a73" stroke="${INK}" stroke-width="3.2"/>` +
          `<path d="M50 6 L62 22 L54 20 L50 24 L45 19 L38 22 Z M34 44 L44 40 L50 46 L57 40 L66 44 L60 50 L50 48 L40 50 Z" fill="#fff" stroke="${INK}" stroke-width="2"/>`,
      );
    case 'lollipop':
      return svg(
        shadow +
          `<rect x="46" y="48" width="8" height="42" rx="3" fill="#fff" stroke="${INK}" stroke-width="3"/>` +
          `<circle cx="50" cy="34" r="27" fill="#ff8fc2" stroke="${INK}" stroke-width="3.2"/>` +
          `<path d="${spiralPath(50, 34, 21)}" fill="none" stroke="#fff" stroke-width="4"/>`,
      );
    default:
      return svg(
        shadow +
          trunk +
          `<circle cx="34" cy="46" r="20" fill="#56b85e" stroke="${INK}" stroke-width="3.2"/>` +
          `<circle cx="66" cy="46" r="20" fill="#56b85e" stroke="${INK}" stroke-width="3.2"/>` +
          `<circle cx="50" cy="30" r="24" fill="#62c46a" stroke="${INK}" stroke-width="3.2"/>` +
          `<path d="M24 50 C28 58 40 62 50 58 C60 62 72 58 76 50" fill="#56b85e"/>` +
          `<path d="M36 22 q6 -8 16 -8" fill="none" stroke="#a6e59a" stroke-width="4"/>` +
          `<circle cx="38" cy="44" r="3.4" fill="#ff7a8a" stroke="${INK}" stroke-width="1.6"/>` +
          `<circle cx="62" cy="36" r="3.4" fill="#ff7a8a" stroke="${INK}" stroke-width="1.6"/>`,
      );
  }
}

export function waterSvg(): string {
  return svg(
    `<rect x="0" y="0" width="100" height="100" fill="#63c2f2"/>` +
      `<path d="M12 30 q9 -7 18 0 t18 0 M52 62 q9 -7 18 0 t18 0 M18 82 q7 -5 14 0" fill="none" stroke="#bfeaff" stroke-width="4.4"/>` +
      `<circle cx="78" cy="24" r="3" fill="#bfeaff"/>`,
  );
}

export function flagSvg(): string {
  return svg(
    `<ellipse cx="38" cy="90" rx="16" ry="4.5" fill="#000" opacity="0.14"/>` +
      `<rect x="33" y="10" width="7" height="80" rx="3" fill="#b07a4f" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="36.5" cy="10" r="5" fill="#ffd84d" stroke="${INK}" stroke-width="2.6"/>` +
      `<path d="M40 16 C56 10 66 24 84 18 L84 50 C66 56 56 42 40 48 Z" fill="#ff6f91" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M50 28 l3 6 l6 1 l-4.5 4.5 l1 6 l-5.5 -3 l-5.5 3 l1 -6 l-4.5 -4.5 l6 -1 Z" fill="#fff4b0"/>`,
  );
}

export function doorSvg(color: ItemColor, open: boolean): string {
  const tint = ITEM_COLOR_HEX[color];
  const frame = `<path d="M18 92 L18 34 C18 14 82 14 82 34 L82 92 Z" fill="#8b5a3c" stroke="${INK}" stroke-width="3.4"/>`;
  if (open) {
    return svg(
      frame +
        `<path d="M25 92 L25 36 C25 22 75 22 75 36 L75 92 Z" fill="#3a2a3f"/>` +
        `<path d="M25 92 L25 36 C25 28 34 24 42 23 L42 96 Z" fill="#c58a5c" stroke="${INK}" stroke-width="3"/>` +
        `<rect x="26" y="50" width="16" height="6" fill="${tint.main}"/>`,
    );
  }
  return svg(
    frame +
      `<path d="M25 92 L25 36 C25 22 75 22 75 36 L75 92 Z" fill="#c58a5c" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M41 28 L41 92 M59 28 L59 92" stroke="#a8704a" stroke-width="3"/>` +
      `<rect x="25" y="48" width="50" height="9" fill="${tint.main}" stroke="${INK}" stroke-width="2.4"/>` +
      `<circle cx="50" cy="70" r="7" fill="${tint.main}" stroke="${INK}" stroke-width="2.6"/>` +
      `<path d="M50 67 v7" stroke="${INK}" stroke-width="3"/>`,
  );
}

export function keySvg(color: ItemColor): string {
  const tint = ITEM_COLOR_HEX[color];
  return svg(
    `<ellipse cx="50" cy="84" rx="26" ry="5" fill="#000" opacity="0.12"/>` +
      `<circle cx="32" cy="50" r="16" fill="${tint.main}" stroke="${INK}" stroke-width="3.4"/>` +
      `<circle cx="32" cy="50" r="6.5" fill="#fff" stroke="${INK}" stroke-width="2.6"/>` +
      `<path d="M47 45 L84 45 L84 55 L78 55 L78 64 L70 64 L70 55 L64 55 L64 62 L57 62 L57 55 L47 55 Z" fill="${tint.main}" stroke="${INK}" stroke-width="3.2"/>` +
      `<path d="M24 40 q6 -6 13 -4" fill="none" stroke="#fff" stroke-width="3" opacity="0.8"/>`,
  );
}

export function portalSvg(): string {
  return svg(
    `<ellipse cx="50" cy="52" rx="38" ry="38" fill="#8b6cff" stroke="${INK}" stroke-width="3.4"/>` +
      `<ellipse cx="50" cy="52" rx="28" ry="28" fill="#b9a4ff"/>` +
      `<path d="${spiralPath(50, 52, 24, 2.2)}" fill="none" stroke="#fff" stroke-width="4.4"/>` +
      `<circle cx="24" cy="24" r="3" fill="#ffe066"/><circle cx="80" cy="30" r="2.4" fill="#ffe066"/><circle cx="76" cy="82" r="3" fill="#ffe066"/>`,
  );
}

export function flowerSvg(): string {
  const bloom = (cx: number, cy: number, petal: string) =>
    [0, 72, 144, 216, 288]
      .map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return `<circle cx="${(cx + Math.cos(rad) * 7).toFixed(1)}" cy="${(cy + Math.sin(rad) * 7).toFixed(1)}" r="6" fill="${petal}" stroke="${INK}" stroke-width="1.8"/>`;
      })
      .join('') +
    `<circle cx="${cx}" cy="${cy}" r="4.5" fill="#ffd84d" stroke="${INK}" stroke-width="1.6"/>`;
  return svg(
    `<path d="M34 90 L34 60 M66 90 L66 52 M50 92 L50 70" stroke="#3f9a57" stroke-width="3.4"/>` +
      `<path d="M34 76 q-8 -6 -12 0 q6 6 12 0 M66 70 q8 -6 12 0 q-6 6 -12 0" fill="#62c46a" stroke="${INK}" stroke-width="1.8"/>` +
      bloom(34, 56, '#ff9fc6') +
      bloom(66, 48, '#fff') +
      bloom(50, 68, '#b8a4ff'),
  );
}

/** Speech-free "ouch" burst drawn at the blocked cell edge after a bump. */
export function burstSvg(): string {
  return svg(
    `<path d="M50 8 L58 34 L86 22 L68 46 L94 58 L64 62 L72 90 L50 70 L28 90 L36 62 L6 58 L32 46 L14 22 L42 34 Z" fill="#fff3b0" stroke="#e8a33a" stroke-width="3.4"/>`,
  );
}
