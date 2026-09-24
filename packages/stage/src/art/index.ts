export * from './palette';
export * from './characters';
export * from './items';
export * from './avatars';
export * from './thumbnail';
export * from './islands';

/** `data:` URL for an SVG string, usable in <img> and as a texture source. */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
