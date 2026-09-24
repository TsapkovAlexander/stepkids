'use client';

import type { BlockDef, BlockNode } from '@stepkids/blocks';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { BlockIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { categoryStyle } from './block-style';

export interface BlockTileProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  def: BlockDef;
  /** A placed block shows its arguments; palette tiles do not. */
  block?: BlockNode;
  label: string;
  active?: boolean;
  oops?: boolean;
  glow?: boolean;
  ghost?: boolean;
  lifted?: boolean;
  compact?: boolean;
}

/** One chunky block: category colour, big icon, short caption and its parameter badge. */
export const BlockTile = forwardRef<HTMLButtonElement, BlockTileProps>(function BlockTile(
  { def, block, label, active, oops, glow, ghost, lifted, compact, className, style, ...rest },
  ref,
) {
  const param = def.params[0];
  const value = block && param ? block.args?.[param.name] : undefined;
  const size = compact ? 'h-16 w-16' : 'h-block w-block';
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        'kid-press relative flex shrink-0 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-[18px] text-ink select-none',
        size,
        active && 'z-10 scale-110 ring-4 ring-white shadow-[0_0_0_8px_rgb(255_224_102/0.9)]',
        oops && 'animate-wiggle ring-4 ring-oops',
        glow && 'animate-pulse-soft ring-4 ring-hint',
        ghost && 'opacity-45 outline-dashed outline-4 outline-ink/40',
        lifted && 'scale-110 rotate-3 opacity-90 shadow-2xl',
        className,
      )}
      style={{ ...categoryStyle(def.category), ...style }}
      {...rest}
    >
      <BlockIcon name={def.icon} aria-hidden size={compact ? 28 : 34} strokeWidth={3} />
      <span className="max-w-full truncate px-1 text-[13px] leading-none font-extrabold">
        {def.label}
      </span>
      {typeof value === 'number' ? (
        <span className="absolute -top-2 -right-2 flex h-8 min-w-8 items-center justify-center rounded-full border-[3px] border-ink bg-white px-1 text-lg leading-none font-black">
          {value}
        </span>
      ) : null}
      {param?.kind === 'text' && typeof value === 'string' ? (
        <span className="absolute -top-3 left-1/2 max-w-[92px] -translate-x-1/2 truncate rounded-full border-2 border-ink bg-white px-2 text-xs font-black">
          {value}
        </span>
      ) : null}
      {param?.kind === 'choice' && typeof value === 'string' ? (
        <ChoiceBadge options={param.options} value={value} />
      ) : null}
    </button>
  );
});

function ChoiceBadge({
  options,
  value,
}: {
  options: Array<{ value: string; icon: string }>;
  value: string;
}) {
  const option = options.find((entry) => entry.value === value);
  if (!option) return null;
  return (
    <span className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-ink bg-white">
      <BlockIcon name={option.icon} aria-hidden size={18} strokeWidth={3} />
    </span>
  );
}
