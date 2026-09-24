import { INK } from './palette';

/**
 * Character art as SVG strings (viewBox 100×100, facing right, feet at y≈94).
 * The renderer mirrors them for walking left; the web app reuses them for avatars.
 */

// The view box leaves head room for long ears and party hats above y = 0.
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -12 112 112" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

const eye = (cx: number, cy: number, rx = 5.2, ry = 6.6) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${INK}"/>` +
  `<circle cx="${cx + 1.8}" cy="${cy - 2.6}" r="2.1" fill="#fff"/>` +
  `<circle cx="${cx - 1.6}" cy="${cy + 2.4}" r="0.9" fill="#fff" opacity="0.8"/>`;

const blush = (cx: number, cy: number) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="4.6" ry="2.8" fill="#ff8fa3" opacity="0.45"/>`;

/** Accessories drawn over the head; `top` is the y of the crown, `cx` its centre. */
function costumeLayer(costume: string, cx: number, top: number): string {
  if (costume === 'party') {
    return (
      `<g transform="rotate(14 ${cx} ${top})">` +
      `<path d="M${cx - 10} ${top + 4} L${cx} ${top - 22} L${cx + 10} ${top + 4} Z" fill="#b28dff" stroke="${INK}" stroke-width="2.6"/>` +
      `<path d="M${cx - 6.5} ${top - 5} L${cx + 6.5} ${top - 5}" stroke="#ffe066" stroke-width="3"/>` +
      `<path d="M${cx - 3.5} ${top - 13} L${cx + 3.5} ${top - 13}" stroke="#ff8fc2" stroke-width="3"/>` +
      `<circle cx="${cx}" cy="${top - 23}" r="4.4" fill="#ffe066" stroke="${INK}" stroke-width="2.2"/>` +
      `</g>`
    );
  }
  if (costume === 'cap') {
    return (
      `<path d="M${cx - 17} ${top + 9} Q${cx - 16} ${top - 9} ${cx + 1} ${top - 9} Q${cx + 17} ${top - 8} ${cx + 17} ${top + 8} Z" fill="#4da3ff" stroke="${INK}" stroke-width="2.6"/>` +
      `<path d="M${cx + 10} ${top + 7} Q${cx + 24} ${top + 4} ${cx + 30} ${top + 10} Q${cx + 22} ${top + 13} ${cx + 10} ${top + 11} Z" fill="#2f7fd6" stroke="${INK}" stroke-width="2.4"/>` +
      `<circle cx="${cx}" cy="${top - 9}" r="2.6" fill="#ffe066" stroke="${INK}" stroke-width="1.8"/>`
    );
  }
  return '';
}

export function kittenSvg(costume = 'default'): string {
  const fur = '#f7a64f';
  const furDark = '#e58a2f';
  const cream = '#ffe7c7';
  return svg(
    // tail
    `<path d="M30 76 C12 74 8 54 20 46" fill="none" stroke="${INK}" stroke-width="12"/>` +
      `<path d="M30 76 C12 74 8 54 20 46" fill="none" stroke="${fur}" stroke-width="7"/>` +
      `<path d="M16.5 52 l4 1.5 M13.5 60 l4.5 0.5" stroke="${furDark}" stroke-width="2.4"/>` +
      // body and paws
      `<ellipse cx="48" cy="76" rx="22" ry="15.5" fill="${fur}" stroke="${INK}" stroke-width="3"/>` +
      `<ellipse cx="52" cy="80" rx="11" ry="9" fill="${cream}"/>` +
      `<ellipse cx="35" cy="90" rx="7" ry="5" fill="${fur}" stroke="${INK}" stroke-width="2.6"/>` +
      `<ellipse cx="62" cy="90" rx="7" ry="5" fill="${fur}" stroke="${INK}" stroke-width="2.6"/>` +
      // ears
      `<path d="M37 30 L36 7 L55 20 Z" fill="${fur}" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M40 25 L40 13 L50 20 Z" fill="#ffb3c1"/>` +
      `<path d="M64 19 L82 8 L81 31 Z" fill="${fur}" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M67 19 L78 13 L77 25 Z" fill="#ffb3c1"/>` +
      // head
      `<ellipse cx="59" cy="41" rx="27" ry="24" fill="${fur}" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M52 19 q2 5 0 9 M59 18 q1.5 5 0 9 M66 19 q-1 5 0 8" stroke="${furDark}" stroke-width="2.6" fill="none"/>` +
      `<ellipse cx="66" cy="51" rx="12" ry="8.5" fill="${cream}"/>` +
      eye(55, 40) +
      eye(74, 40) +
      blush(47, 50) +
      blush(80, 50) +
      `<path d="M63.5 47.5 L68.5 47.5 L66 50.5 Z" fill="#ff7f96" stroke="${INK}" stroke-width="1.6"/>` +
      `<path d="M61 53 q2.5 3 5 0 q2.5 3 5 0" fill="none" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M78 50 L93 47 M78 54 L92 55 M53 51 L40 49" stroke="${INK}" stroke-width="1.6" opacity="0.7"/>` +
      costumeLayer(costume, 60, 19),
  );
}

export function bunnySvg(costume = 'default'): string {
  const fur = '#f5f1fb';
  const shade = '#ddd6ea';
  return svg(
    `<circle cx="27" cy="74" r="8" fill="#fff" stroke="${INK}" stroke-width="2.6"/>` +
      `<ellipse cx="49" cy="76" rx="21" ry="15.5" fill="${fur}" stroke="${INK}" stroke-width="3"/>` +
      `<ellipse cx="53" cy="80" rx="10" ry="8.5" fill="#fff"/>` +
      `<ellipse cx="36" cy="90" rx="7.5" ry="5" fill="${fur}" stroke="${INK}" stroke-width="2.6"/>` +
      `<ellipse cx="63" cy="90" rx="7.5" ry="5" fill="${fur}" stroke="${INK}" stroke-width="2.6"/>` +
      // long ears
      `<path d="M47 24 C40 4 44 -4 51 2 C57 7 57 17 55 25 Z" fill="${fur}" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M49 20 C45 8 47 3 51 6 C54 9 54 15 53 21 Z" fill="#ffc2d1"/>` +
      `<path d="M63 23 C66 3 73 -2 77 4 C80 10 74 19 69 26 Z" fill="${fur}" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M66 20 C68 8 72 4 74 7 C76 11 72 17 69 22 Z" fill="#ffc2d1"/>` +
      `<ellipse cx="60" cy="43" rx="25" ry="22" fill="${fur}" stroke="${INK}" stroke-width="3"/>` +
      `<ellipse cx="45" cy="50" rx="5" ry="3" fill="${shade}" opacity="0.6"/>` +
      eye(54, 41) +
      eye(72, 41) +
      blush(47, 51) +
      blush(79, 51) +
      `<ellipse cx="64" cy="49.5" rx="3.2" ry="2.3" fill="#ff8fab" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M64 52 v3 M59.5 55 q4.5 3 9 0" fill="none" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="61.5" y="56" width="5" height="4.2" rx="1" fill="#fff" stroke="${INK}" stroke-width="1.4"/>` +
      costumeLayer(costume, 61, 22),
  );
}

export function robotSvg(costume = 'default'): string {
  const metal = '#7fd0ee';
  const metalDark = '#4aa8cf';
  return svg(
    `<line x1="60" y1="18" x2="60" y2="7" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="60" cy="6" r="4.5" fill="#ff8fc2" stroke="${INK}" stroke-width="2.4"/>` +
      `<rect x="52" y="56" width="16" height="10" rx="3" fill="${metalDark}" stroke="${INK}" stroke-width="2.6"/>` +
      `<rect x="30" y="64" width="38" height="24" rx="8" fill="${metal}" stroke="${INK}" stroke-width="3"/>` +
      `<circle cx="42" cy="75" r="3.2" fill="#ffe066" stroke="${INK}" stroke-width="1.6"/>` +
      `<circle cx="53" cy="75" r="3.2" fill="#8ef0b0" stroke="${INK}" stroke-width="1.6"/>` +
      `<rect x="31" y="86" width="14" height="8" rx="3" fill="${metalDark}" stroke="${INK}" stroke-width="2.6"/>` +
      `<rect x="54" y="86" width="14" height="8" rx="3" fill="${metalDark}" stroke="${INK}" stroke-width="2.6"/>` +
      `<rect x="36" y="17" width="48" height="42" rx="12" fill="${metal}" stroke="${INK}" stroke-width="3"/>` +
      `<rect x="42" y="25" width="36" height="25" rx="7" fill="#24394a"/>` +
      `<ellipse cx="53" cy="36" rx="4.2" ry="5.2" fill="#8ef0ff"/>` +
      `<ellipse cx="68" cy="36" rx="4.2" ry="5.2" fill="#8ef0ff"/>` +
      `<circle cx="54.5" cy="34" r="1.5" fill="#fff"/>` +
      `<circle cx="69.5" cy="34" r="1.5" fill="#fff"/>` +
      `<path d="M55 44 q5.5 4 11 0" fill="none" stroke="#8ef0ff" stroke-width="2.4"/>` +
      `<rect x="31" y="31" width="6" height="12" rx="3" fill="${metalDark}" stroke="${INK}" stroke-width="2.4"/>` +
      `<rect x="83" y="31" width="6" height="12" rx="3" fill="${metalDark}" stroke="${INK}" stroke-width="2.4"/>` +
      blush(45, 53) +
      blush(76, 53) +
      costumeLayer(costume, 60, 17),
  );
}

export function hedgehogSvg(): string {
  const spikes =
    'M24 78 L14 70 L24 64 L13 55 L26 51 L19 39 L32 40 L30 27 L42 33 L46 20 L54 30 L62 21 L64 34 L74 30 L70 44 L80 46 L70 56';
  return svg(
    `<path d="${spikes} L66 84 Z" fill="#9a6b4f" stroke="${INK}" stroke-width="3"/>` +
      `<path d="M30 60 l6 -4 M34 45 l6 -2 M46 36 l5 1 M58 38 l4 4" stroke="#6f4a35" stroke-width="2.6"/>` +
      `<ellipse cx="56" cy="80" rx="20" ry="12" fill="#e8c6a0" stroke="${INK}" stroke-width="3"/>` +
      `<ellipse cx="45" cy="91" rx="6.5" ry="4.2" fill="#c89f78" stroke="${INK}" stroke-width="2.4"/>` +
      `<ellipse cx="66" cy="91" rx="6.5" ry="4.2" fill="#c89f78" stroke="${INK}" stroke-width="2.4"/>` +
      `<path d="M56 50 C66 44 82 50 90 62 C84 70 72 74 60 72 C54 66 52 58 56 50 Z" fill="#f2d7b6" stroke="${INK}" stroke-width="3"/>` +
      eye(68, 58, 3.6, 4.6) +
      `<circle cx="90" cy="61.5" r="3.6" fill="${INK}"/>` +
      blush(74, 66) +
      `<path d="M78 67 q4 2.5 7 0" fill="none" stroke="${INK}" stroke-width="1.8"/>`,
  );
}

/** Art for a character id; unknown ids fall back to the kitten. */
export function characterSvg(character: string, costume = 'default'): string {
  switch (character) {
    case 'bunny':
      return bunnySvg(costume);
    case 'robot':
      return robotSvg(costume);
    case 'hedgehog':
      return hedgehogSvg();
    default:
      return kittenSvg(costume);
  }
}
