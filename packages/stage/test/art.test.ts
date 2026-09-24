import { describe, expect, it } from 'vitest';
import {
  AVATARS,
  avatarBackground,
  avatarSvg,
  characterSvg,
  doorSvg,
  keySvg,
  sceneThumbnailSvg,
  svgDataUrl,
  treeSvg,
} from '../src/art';

const wellFormed = (svg: string) =>
  svg.startsWith('<svg') && svg.endsWith('</svg>') && !svg.includes('NaN');

describe('art', () => {
  it('draws every character, costume and avatar', () => {
    for (const character of ['kitten', 'bunny', 'robot', 'hedgehog', 'unknown']) {
      for (const costume of ['default', 'party', 'cap'])
        expect(wellFormed(characterSvg(character, costume))).toBe(true);
    }
    for (const avatar of AVATARS) {
      expect(wellFormed(avatarSvg(avatar.id))).toBe(true);
      expect(avatarBackground(avatar.id)).toMatch(/^#/);
    }
    expect(avatarBackground('nope')).toBe('#eef2ff');
  });

  it('draws item variants', () => {
    for (const tree of ['round', 'pine', 'palm', 'snowy', 'lollipop'] as const)
      expect(wellFormed(treeSvg(tree))).toBe(true);
    expect(doorSvg('blue', true)).not.toEqual(doorSvg('blue', false));
    expect(keySvg('pink')).toContain('#ff8fc2');
  });

  it('builds scene thumbnails', () => {
    const svg = sceneThumbnailSvg({
      kind: 'grid',
      cols: 4,
      rows: 3,
      theme: 'forest',
      actors: [
        { id: 'hero', character: 'kitten', x: 0, y: 0, dir: 'left' },
        { id: 'ghost', character: 'bunny', x: 1, y: 0, hidden: true },
      ],
      items: [
        { id: 'w', kind: 'water', x: 1, y: 1 },
        { id: 's', kind: 'star', x: 2, y: 1 },
        { id: 'd', kind: 'door', x: 3, y: 2, color: 'blue' },
      ],
    });
    expect(wellFormed(svg)).toBe(true);
    expect(svg).toContain('viewBox="0 0 160 120"');
    expect(svg).toContain('scale(-1 1)');
    expect(svgDataUrl(svg)).toMatch(/^data:image\/svg\+xml/);
  });
});
