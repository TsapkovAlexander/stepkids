'use client';

import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NumberPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  /** Mask digits (PIN entry). */
  secret?: boolean;
  label: string;
  className?: string;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

/** On-screen keypad: no system keyboard popping up over the gate on tablets. */
export function NumberPad({ value, onChange, maxLength, secret, label, className }: NumberPadProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <output
        aria-label={label}
        className="flex h-16 w-full max-w-72 items-center justify-center rounded-2xl bg-surface text-4xl font-black tracking-[0.3em] text-ink shadow-inner"
      >
        {value ? (secret ? '•'.repeat(value.length) : value) : <span className="text-ink/25">{'—'.repeat(Math.min(3, maxLength))}</span>}
      </output>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Цифры">
        {KEYS.map((key) =>
          key === '' ? (
            <span key="blank" />
          ) : (
            <button
              key={key}
              type="button"
              aria-label={key === 'del' ? 'Стереть' : key}
              className="kid-press flex h-16 w-20 items-center justify-center rounded-2xl bg-surface text-3xl font-extrabold text-ink [--press-edge:var(--color-line)]"
              onClick={() => {
                if (key === 'del') onChange(value.slice(0, -1));
                else if (value.length < maxLength) onChange(value + key);
              }}
            >
              {key === 'del' ? <Delete aria-hidden size={30} /> : key}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
