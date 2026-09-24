'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Lock, Plus, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, CharacterArt } from '@/components/kid/art-image';
import { KidButton } from '@/components/kid/kid-button';
import { useParentGate } from '@/components/kid/parent-gate';
import { setActiveProfileId } from '@/lib/active-profile';
import { sfx } from '@/lib/audio/sfx';
import { listProfiles } from '@/lib/storage/profiles';
import type { Profile } from '@/lib/storage/types';
import { voice } from '@/lib/voice/voice';
import { AddProfileDialog } from './add-profile-dialog';

const TITLE = 'Кто играет?';

export function ProfilePicker() {
  const router = useRouter();
  const profiles = useLiveQuery(() => listProfiles(), [], undefined);
  const { requestPass, gate } = useParentGate();
  const [adding, setAdding] = useState(false);

  const choose = (profile: Profile) => {
    sfx.unlock();
    sfx.add();
    voice.say(`Привет, ${profile.name}!`);
    setActiveProfileId(profile.id);
    router.push('/play/map');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-ink sm:text-4xl">{TITLE}</h1>
          <KidButton
            voiceLabel={TITLE}
            icon={Volume2}
            round
            silent
            onClick={() => voice.say(TITLE)}
          />
        </div>
        <KidButton
          voiceLabel="Для взрослых"
          icon={Lock}
          round
          tone="surface"
          onClick={() => requestPass(() => router.push('/family'))}
        />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-6" aria-busy={profiles === undefined}>
        {profiles === undefined ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-hidden>
            {[0, 1].map((key) => (
              <div key={key} className="aspect-[4/5] animate-pulse rounded-[28px] bg-white/60" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-6 text-center">
            <CharacterArt character="kitten" className="h-44 w-44 animate-float" />
            <p className="text-2xl font-extrabold">Привет! Я котёнок Кузя. Давай познакомимся!</p>
            <KidButton
              voiceLabel="Добавить игрока"
              caption="Добавить игрока"
              icon={Plus}
              tone="go"
              size="lg"
              onClick={() => requestPass(() => setAdding(true))}
            />
            <p className="text-base text-ink-soft">Попросите взрослого создать профиль.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {profiles.map((profile) => (
              <li key={profile.id}>
                <button
                  type="button"
                  aria-label={profile.name}
                  onClick={() => choose(profile)}
                  className="kid-press flex w-full flex-col items-center gap-2 rounded-[28px] bg-surface p-4 [--press-edge:var(--color-line)]"
                >
                  <Avatar avatarId={profile.avatarId} className="aspect-square w-full max-w-40" />
                  <span className="max-w-full truncate text-2xl font-black">{profile.name}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                aria-label="Добавить игрока"
                onClick={() => {
                  voice.say('Добавить игрока');
                  requestPass(() => setAdding(true));
                }}
                className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-[28px] border-4 border-dashed border-white bg-white/40 text-ink-soft"
              >
                <Plus aria-hidden size={56} strokeWidth={3} />
                <span className="text-xl font-extrabold">Добавить</span>
              </button>
            </li>
          </ul>
        )}
      </main>
      {gate}
      <AddProfileDialog
        open={adding}
        onOpenChange={setAdding}
        onCreated={(profile) => {
          setAdding(false);
          choose(profile);
        }}
      />
    </div>
  );
}
