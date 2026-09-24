import { ITEM_COLORS, type GridItemKind, type ItemColor } from '@stepkids/blocks';
import { Texture } from 'pixi.js';
import {
  burstSvg,
  characterSvg,
  doorSvg,
  flagSvg,
  flowerSvg,
  keySvg,
  portalSvg,
  rockSvg,
  starSvg,
  svgDataUrl,
  treeSvg,
  waterSvg,
  type ThemePalette,
} from './art';

/** Raster size of every texture; sprites are scaled down, so it stays crisp on retina tablets. */
const TEXTURE_SIZE = 256;

const cache = new Map<string, Promise<Texture>>();

async function rasterize(svg: string, size: number): Promise<HTMLCanvasElement> {
  // Explicit width/height makes Firefox and Safari decode the SVG at full size.
  const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
  const image = new Image();
  image.decoding = 'async';
  image.src = svgDataUrl(sized);
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is not available');
  context.drawImage(image, 0, 0, size, size);
  return canvas;
}

export function svgTexture(key: string, svg: () => string): Promise<Texture> {
  let texture = cache.get(key);
  if (!texture) {
    texture = rasterize(svg(), TEXTURE_SIZE).then((canvas) => Texture.from(canvas));
    cache.set(key, texture);
  }
  return texture;
}

export function characterTexture(character: string, costume: string): Promise<Texture> {
  return svgTexture(`char:${character}:${costume}`, () => characterSvg(character, costume));
}

export function itemTexture(
  kind: GridItemKind,
  options: { color?: ItemColor; open?: boolean; tree?: ThemePalette['tree'] } = {},
): Promise<Texture> {
  const color = options.color ?? 'yellow';
  switch (kind) {
    case 'star':
      return svgTexture('star', starSvg);
    case 'rock':
      return svgTexture('rock', rockSvg);
    case 'tree': {
      const tree = options.tree ?? 'round';
      return svgTexture(`tree:${tree}`, () => treeSvg(tree));
    }
    case 'water':
      return svgTexture('water', waterSvg);
    case 'flag':
      return svgTexture('flag', flagSvg);
    case 'door':
      return svgTexture(`door:${color}:${options.open ? 'open' : 'closed'}`, () =>
        doorSvg(color, !!options.open),
      );
    case 'key':
      return svgTexture(`key:${color}`, () => keySvg(color));
    case 'teleport':
      return svgTexture('portal', portalSvg);
    case 'flower':
      return svgTexture('flower', flowerSvg);
  }
}

export function burstTexture(): Promise<Texture> {
  return svgTexture('burst', burstSvg);
}

/** Warms the cache for a scene so the first frame is complete. */
export async function preloadTextures(
  characters: ReadonlyArray<{ character: string; costumes: readonly string[] }>,
  tree: ThemePalette['tree'],
): Promise<void> {
  const jobs: Array<Promise<Texture>> = [burstTexture()];
  for (const { character, costumes } of characters) {
    for (const costume of costumes) jobs.push(characterTexture(character, costume));
  }
  for (const kind of ['star', 'rock', 'water', 'flag', 'teleport', 'flower'] as const)
    jobs.push(itemTexture(kind));
  jobs.push(itemTexture('tree', { tree }));
  for (const color of ITEM_COLORS) {
    jobs.push(
      itemTexture('key', { color }),
      itemTexture('door', { color }),
      itemTexture('door', { color, open: true }),
    );
  }
  await Promise.all(jobs);
}
