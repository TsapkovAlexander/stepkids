import { describe, expect, it } from 'vitest';
import { cellAt, cellCenter, computeLayout } from '../src/layout';

describe('computeLayout', () => {
  it('fits the board inside the view and centres it', () => {
    const layout = computeLayout(1000, 700, 8, 6);
    expect(layout.cell * 8).toBeLessThanOrEqual(1000);
    expect(layout.originY + layout.height + layout.border).toBeLessThanOrEqual(700);
    expect(layout.originX).toBe(Math.round((1000 - layout.width) / 2));
    expect(layout.width).toBe(layout.cell * 8);
  });

  it('keeps a minimal cell size in tiny views', () => {
    expect(computeLayout(10, 10, 10, 8).cell).toBe(8);
  });

  it('is limited by width on narrow phones', () => {
    const layout = computeLayout(360, 640, 6, 4);
    expect(layout.cell).toBeLessThanOrEqual(Math.floor((360 - 2 * (10 + layout.border)) / 6));
  });
});

describe('cell helpers', () => {
  const layout = computeLayout(600, 460, 6, 4);

  it('round-trips cell centres', () => {
    const c = cellCenter(layout, 2, 3);
    expect(cellAt(layout, c.x, c.y, 6, 4)).toEqual({ x: 2, y: 3 });
  });

  it('returns null outside the board', () => {
    expect(cellAt(layout, layout.originX - 1, layout.originY, 6, 4)).toBeNull();
    expect(cellAt(layout, layout.originX + layout.width + 1, layout.originY + 1, 6, 4)).toBeNull();
  });
});
