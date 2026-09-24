import type { BlockCategory } from '@stepkids/blocks';
import type { CSSProperties } from 'react';

/** Category colours from the spec, as CSS variables defined in globals.css. */
export function categoryStyle(category: BlockCategory): CSSProperties {
  return {
    background: `var(--color-cat-${category})`,
    ['--press-edge' as string]: `var(--color-cat-${category}-dark)`,
  };
}
