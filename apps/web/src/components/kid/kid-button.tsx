'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type CSSProperties } from 'react';
import { sfx } from '@/lib/audio/sfx';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';

const kidButton = cva(
  'kid-press relative inline-flex select-none items-center justify-center gap-2 rounded-kid font-extrabold outline-none transition-colors',
  {
    variants: {
      tone: {
        go: 'bg-go text-white [--press-edge:var(--color-go-dark)]',
        calm: 'bg-calm text-white [--press-edge:var(--color-calm-dark)]',
        brand: 'bg-brand text-white [--press-edge:var(--color-brand-dark)]',
        sun: 'bg-sun text-ink [--press-edge:var(--color-sun-dark)]',
        surface: 'bg-surface text-ink [--press-edge:var(--color-line)]',
        hint: 'bg-hint text-ink [--press-edge:var(--color-sun-dark)]',
      },
      size: {
        md: 'min-h-target min-w-target px-3 text-lg',
        lg: 'min-h-18 min-w-18 px-4 text-xl',
        xl: 'min-h-24 min-w-24 px-6 text-2xl',
      },
      round: { true: 'rounded-full px-0', false: '' },
    },
    defaultVariants: { tone: 'surface', size: 'md', round: false },
  },
);

export interface KidButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>,
    VariantProps<typeof kidButton> {
  /** Spoken on every tap and used as the accessible name. */
  voiceLabel: string;
  icon?: LucideIcon;
  /** Visible caption under/next to the icon (≤ 12 characters for children). */
  caption?: string;
  /** Do not speak on tap (e.g. when the action itself speaks). */
  silent?: boolean;
  iconClassName?: string;
}

export const KidButton = forwardRef<HTMLButtonElement, KidButtonProps>(function KidButton(
  {
    voiceLabel,
    icon: Icon,
    caption,
    silent,
    tone,
    size,
    round,
    className,
    iconClassName,
    onClick,
    children,
    style,
    ...rest
  },
  ref,
) {
  const iconSize = size === 'xl' ? 44 : size === 'lg' ? 34 : 28;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={voiceLabel}
      className={cn(kidButton({ tone, size, round }), className)}
      style={style as CSSProperties}
      onClick={(event) => {
        sfx.unlock();
        sfx.tap();
        if (!silent) voice.say(voiceLabel);
        onClick?.(event);
      }}
      {...rest}
    >
      {Icon ? (
        <Icon aria-hidden size={iconSize} strokeWidth={2.75} className={iconClassName} />
      ) : null}
      {caption ? <span className="leading-none">{caption}</span> : null}
      {children}
    </button>
  );
});
