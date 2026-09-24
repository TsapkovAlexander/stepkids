'use client';

import { AVATARS } from '@stepkids/stage/art';
import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';
import { Avatar } from './art-image';

/** Radio group of avatars with roving focus (arrows, Home, End). */
export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.max(0, AVATARS.findIndex((avatar) => avatar.id === value));

  const focus = (next: number) => {
    const wrapped = (next + AVATARS.length) % AVATARS.length;
    const avatar = AVATARS[wrapped];
    if (!avatar) return;
    onChange(avatar.id);
    refs.current[wrapped]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (event.key in moves) focus(index + (moves[event.key] ?? 0));
    else if (event.key === 'Home') focus(0);
    else if (event.key === 'End') focus(AVATARS.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div role="radiogroup" aria-label="Аватар" className="grid grid-cols-4 gap-3" onKeyDown={onKeyDown}>
      {AVATARS.map((avatar, i) => {
        const selected = avatar.id === value;
        return (
          <button
            key={avatar.id}
            ref={(node) => {
              refs.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={avatar.label}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              onChange(avatar.id);
              voice.say(avatar.label);
            }}
            className={cn(
              'flex aspect-square min-h-target items-center justify-center rounded-3xl border-4 bg-surface p-1 transition',
              selected ? 'border-brand scale-105 shadow-lg' : 'border-transparent',
            )}
          >
            <Avatar avatarId={avatar.id} className="h-full w-full" />
          </button>
        );
      })}
    </div>
  );
}
