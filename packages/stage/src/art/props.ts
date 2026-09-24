import { characterSvg } from './characters';
import { flagSvg, flowerSvg, keySvg, portalSvg, rockSvg, starSvg, treeSvg } from './items';
import { INK } from './palette';

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

const eyes = (lx: number, rx: number, y: number, r = 4) =>
  [lx, rx]
    .map(
      (x) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + 1.4}" cy="${y - 1.6}" r="${r * 0.4}" fill="#fff"/>`,
    )
    .join('');

/** Free-scene props, drawn facing right (direction 90). */
export function rocketSvg(costume = 'default'): string {
  const flame =
    costume === 'fly'
      ? `<path d="M4 50 C14 40 18 44 24 50 C18 56 14 60 4 50 Z" fill="#ffb347" stroke="${INK}" stroke-width="2.4"/><path d="M12 50 C17 46 19 48 22 50 C19 52 17 54 12 50 Z" fill="#ffe066"/>`
      : '';
  return svg(
    flame +
      `<path d="M26 36 L14 24 L34 30 Z M26 64 L14 76 L34 70 Z" fill="#ff6f91" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M24 38 C40 30 70 30 92 50 C70 70 40 70 24 62 Z" fill="#f4f1fb" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M78 40 C84 44 88 47 92 50 C88 53 84 56 78 60 Z" fill="#ff6f91" stroke="${INK}" stroke-width="2.6"/>` +
      `<circle cx="58" cy="50" r="9" fill="#7fd0ee" stroke="${INK}" stroke-width="3"/><circle cx="61" cy="47" r="3" fill="#fff"/>`,
  );
}

export function planetSvg(): string {
  return svg(
    `<ellipse cx="50" cy="54" rx="46" ry="12" fill="none" stroke="#ffcf3f" stroke-width="6" transform="rotate(-16 50 54)"/>` +
      `<circle cx="50" cy="50" r="30" fill="#8b6cff" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="40" cy="42" r="6" fill="#b9a4ff"/><circle cx="60" cy="60" r="4" fill="#b9a4ff"/>` +
      `<path d="M14 62 C30 72 70 70 88 50" fill="none" stroke="#ffcf3f" stroke-width="6" stroke-linecap="round"/>` +
      eyes(42, 58, 50, 3.4) +
      `<path d="M44 58 q6 4 12 0" fill="none" stroke="${INK}" stroke-width="2"/>`,
  );
}

export function fishSvg(costume = 'default'): string {
  const body = costume === 'gold' ? '#ffcf3f' : '#ff9f43';
  return svg(
    `<path d="M20 50 L4 34 L6 66 Z" fill="${body}" stroke="${INK}" stroke-width="3"/>` +
      `<ellipse cx="52" cy="50" rx="34" ry="24" fill="${body}" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M40 30 C46 22 58 22 62 28" fill="${body}" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M38 40 q4 10 0 20 M48 38 q4 12 0 24" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="3"/>` +
      `<circle cx="70" cy="44" r="5" fill="${INK}"/><circle cx="71.6" cy="42.4" r="2" fill="#fff"/>` +
      `<path d="M78 56 q4 2 6 -2" fill="none" stroke="${INK}" stroke-width="2.4"/>`,
  );
}

export function ballSvg(): string {
  return svg(
    `<circle cx="50" cy="50" r="34" fill="#fff" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M50 16 C38 30 38 70 50 84 M16 50 C30 38 70 38 84 50" fill="none" stroke="#ff6f91" stroke-width="5"/>` +
      `<path d="M30 28 q6 -6 14 -8" fill="none" stroke="#fff" stroke-width="4"/>`,
  );
}

export function appleSvg(): string {
  return svg(
    `<path d="M50 30 C36 18 12 26 14 52 C16 78 36 90 50 82 C64 90 84 78 86 52 C88 26 64 18 50 30 Z" fill="#ff6b6b" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M50 30 C50 22 52 16 56 12" fill="none" stroke="#8b5a3c" stroke-width="4"/>` +
      `<path d="M56 18 C64 10 76 12 78 18 C70 24 62 24 56 18 Z" fill="#62c46a" stroke="${INK}" stroke-width="2.4"/>` +
      `<path d="M28 44 q2 -10 10 -14" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="4"/>`,
  );
}

export function carSvg(costume = 'default'): string {
  const paint = costume === 'blue' ? '#5ab8ff' : '#ff6f91';
  return svg(
    `<path d="M8 62 L12 48 C14 42 20 40 26 40 L34 40 L44 26 C46 24 50 22 54 22 L70 22 C74 22 78 24 80 28 L86 40 C92 42 94 46 94 52 L94 62 Z" fill="${paint}" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M46 40 L54 28 L66 28 L66 40 Z M70 28 L74 28 L80 40 L70 40 Z" fill="#bfeaff" stroke="${INK}" stroke-width="2.4"/>` +
      `<circle cx="28" cy="66" r="10" fill="#3d2c29"/><circle cx="28" cy="66" r="4" fill="#d9d9d9"/>` +
      `<circle cx="74" cy="66" r="10" fill="#3d2c29"/><circle cx="74" cy="66" r="4" fill="#d9d9d9"/>` +
      `<circle cx="90" cy="50" r="3" fill="#ffe066"/>`,
  );
}

export const PROPS = ['rocket', 'planet', 'fish', 'ball', 'apple', 'car'] as const;

export const PROP_COSTUMES: Record<string, string[]> = {
  rocket: ['default', 'fly'],
  fish: ['default', 'gold'],
  car: ['default', 'blue'],
};

/** Art for any sprite of a free scene: heroes, grid items and props. */
export function spriteSvg(character: string, costume = 'default'): string {
  switch (character) {
    case 'rocket':
      return rocketSvg(costume);
    case 'planet':
      return planetSvg();
    case 'fish':
      return fishSvg(costume);
    case 'ball':
      return ballSvg();
    case 'apple':
      return appleSvg();
    case 'car':
      return carSvg(costume);
    case 'star':
      return starSvg();
    case 'flag':
      return flagSvg();
    case 'key':
      return keySvg('yellow');
    case 'rock':
      return rockSvg();
    case 'tree':
      return treeSvg('round');
    case 'flower':
      return flowerSvg();
    case 'portal':
      return portalSvg();
    default:
      return characterSvg(character, costume);
  }
}
