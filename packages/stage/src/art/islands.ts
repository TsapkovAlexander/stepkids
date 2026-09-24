import { flowerSvg, flagSvg, rockSvg, treeSvg } from './items';
import { INK, THEMES } from './palette';
import type { GridTheme } from '@stepkids/blocks';

const nested = (svg: string, x: number, y: number, size: number) =>
  svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${size}" height="${size}" `);

/** World-map island for a theme (viewBox 200×150). */
export function islandSvg(island: string): string {
  const theme = (island in THEMES ? island : 'meadow') as GridTheme;
  const palette = THEMES[theme];
  const tree = treeSvg(palette.tree);
  const decorations =
    theme === 'forest'
      ? nested(tree, 38, 22, 52) + nested(tree, 70, 10, 60) + nested(tree, 112, 24, 50) + nested(rockSvg(), 140, 60, 30)
      : nested(tree, 44, 18, 54) + nested(flowerSvg(), 104, 52, 34) + nested(flowerSvg(), 62, 62, 28) + nested(flagSvg(), 118, 14, 52);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" stroke-linejoin="round">` +
    `<ellipse cx="100" cy="112" rx="94" ry="30" fill="#8fd6ff" opacity="0.7"/>` +
    `<path d="M20 96 C18 70 50 52 100 50 C150 48 184 68 180 96 C176 122 140 132 100 132 C58 132 22 122 20 96 Z" fill="#f3d99b" stroke="${INK}" stroke-width="3"/>` +
    `<path d="M30 90 C30 68 58 56 100 56 C142 56 170 70 170 90 C170 108 138 118 100 118 C62 118 30 110 30 90 Z" fill="${palette.tileA}" stroke="${INK}" stroke-width="3"/>` +
    `<path d="M48 96 C60 104 80 108 100 108" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="4" stroke-linecap="round"/>` +
    decorations +
    `</svg>`
  );
}
