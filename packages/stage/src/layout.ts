/** Pure geometry of the grid board, shared by the renderer, hit-testing and thumbnails. */
export interface BoardLayout {
  cell: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  border: number;
}

export function computeLayout(
  viewWidth: number,
  viewHeight: number,
  cols: number,
  rows: number,
  padding = 10,
): BoardLayout {
  const border = Math.max(6, Math.min(14, Math.round(Math.min(viewWidth, viewHeight) * 0.02)));
  const availableW = Math.max(1, viewWidth - 2 * (padding + border));
  // Room above the top row for speech bubbles and tall sprites.
  const headroom = Math.min(56, viewHeight * 0.1);
  const shadow = 6;
  const availableH = Math.max(1, viewHeight - 2 * (padding + border) - headroom - shadow);
  const cell = Math.max(8, Math.floor(Math.min(availableW / cols, availableH / rows)));
  const width = cell * cols;
  const height = cell * rows;
  return {
    cell,
    border,
    width,
    height,
    originX: Math.round((viewWidth - width) / 2),
    originY: Math.round(headroom + (viewHeight - headroom - shadow - height) / 2),
  };
}

export function cellCenter(layout: BoardLayout, x: number, y: number): { x: number; y: number } {
  return {
    x: layout.originX + (x + 0.5) * layout.cell,
    y: layout.originY + (y + 0.5) * layout.cell,
  };
}

/** Cell under a point in view coordinates, or null outside the board. */
export function cellAt(
  layout: BoardLayout,
  px: number,
  py: number,
  cols: number,
  rows: number,
): { x: number; y: number } | null {
  const x = Math.floor((px - layout.originX) / layout.cell);
  const y = Math.floor((py - layout.originY) / layout.cell);
  if (x < 0 || y < 0 || x >= cols || y >= rows) return null;
  return { x, y };
}
