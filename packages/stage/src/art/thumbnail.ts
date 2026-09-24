import type { GridSceneInput } from '@stepkids/blocks';
import { characterSvg } from './characters';
import {
  doorSvg,
  flagSvg,
  flowerSvg,
  keySvg,
  portalSvg,
  rockSvg,
  starSvg,
  treeSvg,
  waterSvg,
} from './items';
import { THEMES } from './palette';

const CELL = 40;

function nested(svg: string, x: number, y: number, size: number): string {
  return svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${size}" height="${size}" `);
}

/**
 * Static SVG picture of a grid scene — for project cards and level previews.
 * Pure string building, so it also works on the server and in tests.
 */
export function sceneThumbnailSvg(scene: GridSceneInput): string {
  const theme = THEMES[scene.theme ?? 'meadow'];
  const width = scene.cols * CELL;
  const height = scene.rows * CELL;
  const parts: string[] = [
    `<rect width="${width}" height="${height}" rx="10" fill="${theme.tileA}"/>`,
  ];
  for (let y = 0; y < scene.rows; y += 1) {
    for (let x = 0; x < scene.cols; x += 1) {
      if ((x + y) % 2 === 1)
        parts.push(
          `<rect x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}" fill="${theme.tileB}"/>`,
        );
    }
  }
  const art = (kind: string, color: 'yellow' | 'blue' | 'pink' = 'yellow'): string | null => {
    switch (kind) {
      case 'star':
        return starSvg();
      case 'rock':
        return rockSvg();
      case 'tree':
        return treeSvg(theme.tree);
      case 'flag':
        return flagSvg();
      case 'door':
        return doorSvg(color, false);
      case 'key':
        return keySvg(color);
      case 'teleport':
        return portalSvg();
      case 'flower':
        return flowerSvg();
      default:
        return null;
    }
  };
  for (const item of scene.items) {
    if (item.kind === 'water') parts.push(nested(waterSvg(), item.x * CELL, item.y * CELL, CELL));
  }
  for (const item of scene.items) {
    const svg = art(item.kind, item.color);
    if (svg) parts.push(nested(svg, item.x * CELL + 2, item.y * CELL + 2, CELL - 4));
  }
  for (const actor of scene.actors) {
    if (actor.hidden) continue;
    const svg = characterSvg(actor.character, actor.costume);
    const flip =
      actor.dir === 'left'
        ? ` transform="translate(${(actor.x * 2 + 1) * CELL} 0) scale(-1 1)"`
        : '';
    parts.push(`<g${flip}>${nested(svg, actor.x * CELL - 2, actor.y * CELL - 4, CELL + 4)}</g>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
}
