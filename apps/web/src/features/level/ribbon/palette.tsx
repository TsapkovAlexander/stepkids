'use client';

import type { BlockDef } from '@stepkids/blocks';
import { cn } from '@/lib/utils';
import { BlockTile } from './block-tile';

export interface PaletteProps {
  blocks: BlockDef[];
  onPick: (def: BlockDef) => void;
  highlight?: string | null;
  disabled?: boolean;
  className?: string;
}

/** Blocks available in this level; a tap adds the block to the end of the program. */
export function Palette({ blocks, onPick, highlight, disabled, className }: PaletteProps) {
  return (
    <div role="toolbar" aria-label="Блоки" className={cn('flex flex-wrap items-center justify-center gap-3 p-2', className)}>
      {blocks.map((def) => (
        <BlockTile
          key={def.type}
          def={def}
          label={`${def.label}. Добавить`}
          glow={highlight === def.type}
          aria-disabled={disabled}
          className={cn(disabled && 'opacity-60')}
          onClick={() => onPick(def)}
        />
      ))}
    </div>
  );
}
