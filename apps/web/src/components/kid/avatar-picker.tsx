'use client';

import { AVATARS } from '@stepkids/stage/art';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';
import { Avatar } from './art-image';
import { radioTabIndex, rovingRadioKeyDown } from './roving';

/** Radio group of avatars with roving focus (arrows, Home, End). */
export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const index = AVATARS.findIndex((avatar) => avatar.id === value);

  return (
    <div role="radiogroup" aria-label="Аватар" className="grid grid-cols-4 gap-3" onKeyDown={rovingRadioKeyDown}>
      {AVATARS.map((avatar, i) => {
        const selected = avatar.id === value;
        return (
          <button
            key={avatar.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={avatar.label}
            tabIndex={radioTabIndex(i, index)}
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
