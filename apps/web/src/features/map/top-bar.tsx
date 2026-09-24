'use client';

import { Hammer, Images, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar, CharacterArt } from '@/components/kid/art-image';
import { KidButton } from '@/components/kid/kid-button';
import type { Profile } from '@/lib/storage/types';
import { voice } from '@/lib/voice/voice';

export function MapTopBar({ profile, stars, onHero }: { profile: Profile; stars: number; onHero: () => void }) {
  const router = useRouter();
  return (
    <header className="flex flex-wrap items-center gap-2 p-3 sm:gap-3 sm:p-4">
      <button
        type="button"
        aria-label={`${profile.name}. Сменить игрока`}
        onClick={() => {
          voice.say('Сменить игрока');
          router.push('/play');
        }}
        className="kid-press flex min-h-target items-center gap-2 rounded-full bg-surface py-1 pr-4 pl-1 [--press-edge:var(--color-line)]"
      >
        <Avatar avatarId={profile.avatarId} className="h-12 w-12" />
        <span className="max-w-32 truncate text-xl font-black">{profile.name}</span>
      </button>
      <span
        className="flex min-h-target items-center gap-1.5 rounded-full bg-surface px-4 text-2xl font-black shadow-[0_5px_0_var(--color-line)]"
        aria-label={`Звёзд: ${stars}`}
      >
        <Star aria-hidden size={28} className="fill-sun text-sun-dark" />
        {stars}
      </span>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Мой герой"
          onClick={() => {
            voice.say('Мой герой');
            onHero();
          }}
          className="kid-press flex h-target w-target items-center justify-center rounded-full bg-surface [--press-edge:var(--color-line)]"
        >
          <CharacterArt character={profile.heroId} className="h-12 w-12" />
        </button>
        <KidButton voiceLabel="Мастерская" icon={Hammer} tone="brand" round onClick={() => router.push('/play/workshop')} />
        <KidButton voiceLabel="Мои проекты" icon={Images} tone="sun" round onClick={() => router.push('/play/projects')} />
      </div>
    </header>
  );
}
