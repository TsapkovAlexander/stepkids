import { characterSvg } from './characters';
import { INK } from './palette';

/** Profile avatars: the heroes plus a few animals that only appear as avatars. */
export const AVATARS = [
  { id: 'kitten', label: 'Котёнок', bg: '#ffe3c2' },
  { id: 'bunny', label: 'Зайка', bg: '#e7e0ff' },
  { id: 'fox', label: 'Лисичка', bg: '#ffd9c7' },
  { id: 'bear', label: 'Мишка', bg: '#f1e1cf' },
  { id: 'owl', label: 'Совёнок', bg: '#dff0ff' },
  { id: 'frog', label: 'Лягушонок', bg: '#dcf7d2' },
  { id: 'robot', label: 'Робот', bg: '#d6f3ff' },
  { id: 'hedgehog', label: 'Ёжик', bg: '#f6e6d6' },
] as const;

export type AvatarId = (typeof AVATARS)[number]['id'];

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

const eyes = (lx: number, rx: number, y: number) =>
  [lx, rx]
    .map(
      (x) =>
        `<ellipse cx="${x}" cy="${y}" rx="5" ry="6.4" fill="${INK}"/><circle cx="${x + 1.8}" cy="${y - 2.4}" r="2" fill="#fff"/>`,
    )
    .join('');

const cheeks = (lx: number, rx: number, y: number) =>
  `<ellipse cx="${lx}" cy="${y}" rx="4.6" ry="2.8" fill="#ff8fa3" opacity="0.45"/><ellipse cx="${rx}" cy="${y}" rx="4.6" ry="2.8" fill="#ff8fa3" opacity="0.45"/>`;

function foxSvg(): string {
  return svg(
    `<path d="M20 30 L28 6 L44 24 Z M80 30 L72 6 L56 24 Z" fill="#f28a3c" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M26 24 L29 13 L37 22 Z M74 24 L71 13 L63 22 Z" fill="#fff1e6"/>` +
      `<path d="M14 46 C14 28 30 18 50 18 C70 18 86 28 86 46 C86 66 68 84 50 88 C32 84 14 66 14 46 Z" fill="#f28a3c" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M20 52 C30 56 40 62 50 88 C60 62 70 56 80 52 C74 72 62 84 50 88 C38 84 26 72 20 52 Z" fill="#fff1e6"/>` +
      eyes(38, 62, 48) +
      cheeks(28, 72, 60) +
      `<ellipse cx="50" cy="66" rx="5" ry="3.6" fill="${INK}"/><path d="M45 72 q5 4 10 0" fill="none" stroke="${INK}" stroke-width="2"/>`,
  );
}

function bearSvg(): string {
  return svg(
    `<circle cx="24" cy="26" r="12" fill="#b07a53" stroke="${INK}" stroke-width="3"/><circle cx="76" cy="26" r="12" fill="#b07a53" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="24" cy="26" r="6" fill="#e3b58f"/><circle cx="76" cy="26" r="6" fill="#e3b58f"/>` +
      `<circle cx="50" cy="54" r="36" fill="#b07a53" stroke="${INK}" stroke-width="3"/>` +
      `<ellipse cx="50" cy="68" rx="16" ry="12" fill="#e3b58f"/>` +
      eyes(36, 64, 50) +
      cheeks(26, 74, 62) +
      `<ellipse cx="50" cy="62" rx="6" ry="4.4" fill="${INK}"/><path d="M44 71 q6 5 12 0" fill="none" stroke="${INK}" stroke-width="2"/>`,
  );
}

function owlSvg(): string {
  return svg(
    `<path d="M22 22 L30 36 L18 38 Z M78 22 L70 36 L82 38 Z" fill="#8d7be8" stroke="${INK}" stroke-width="3"/>` +
      `<ellipse cx="50" cy="56" rx="34" ry="36" fill="#9d8cf0" stroke="${INK}" stroke-width="3"/>` +
      `<ellipse cx="50" cy="72" rx="18" ry="16" fill="#d9d1ff"/>` +
      `<path d="M42 70 q4 3 8 0 q4 3 8 0 M40 80 q5 3 10 0 q5 3 10 0" fill="none" stroke="#9d8cf0" stroke-width="2.2"/>` +
      `<circle cx="36" cy="46" r="13" fill="#fff" stroke="${INK}" stroke-width="2.6"/><circle cx="64" cy="46" r="13" fill="#fff" stroke="${INK}" stroke-width="2.6"/>` +
      eyes(36, 64, 46) +
      `<path d="M46 56 L54 56 L50 63 Z" fill="#ffc94d" stroke="${INK}" stroke-width="2"/>`,
  );
}

function frogSvg(): string {
  return svg(
    `<circle cx="30" cy="30" r="14" fill="#7fd36b" stroke="${INK}" stroke-width="3"/><circle cx="70" cy="30" r="14" fill="#7fd36b" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="30" cy="30" r="8" fill="#fff"/><circle cx="70" cy="30" r="8" fill="#fff"/>` +
      eyes(30, 70, 31) +
      `<ellipse cx="50" cy="60" rx="38" ry="28" fill="#7fd36b" stroke="${INK}" stroke-width="3"/>` +
      `<ellipse cx="50" cy="72" rx="24" ry="12" fill="#c9f2b8"/>` +
      cheeks(24, 76, 62) +
      `<path d="M34 58 q16 12 32 0" fill="none" stroke="${INK}" stroke-width="2.6"/>`,
  );
}

/** Square avatar art (without background) for an avatar id. */
export function avatarSvg(id: string): string {
  switch (id) {
    case 'fox':
      return foxSvg();
    case 'bear':
      return bearSvg();
    case 'owl':
      return owlSvg();
    case 'frog':
      return frogSvg();
    default:
      return characterSvg(id);
  }
}

export function avatarBackground(id: string): string {
  return AVATARS.find((avatar) => avatar.id === id)?.bg ?? '#eef2ff';
}
