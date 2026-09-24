'use client';

import { CHARACTERS } from '@stepkids/content';
import { Lock } from 'lucide-react';
import { CharacterArt } from '@/components/kid/art-image';
import { KidDialog } from '@/components/kid/kid-dialog';
import { sfx } from '@/lib/audio/sfx';
import { worldById } from '@/lib/content/catalog';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';

export interface HeroPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: string;
  unlocked: readonly string[];
  onPick: (heroId: string) => void;
}

/** Heroes the child earned by finishing worlds, plus the ones still waiting. */
export function HeroPicker({ open, onOpenChange, current, unlocked, onPick }: HeroPickerProps) {
  const heroes = CHARACTERS.filter((character) => character.role === 'hero');
  return (
    <KidDialog open={open} onOpenChange={onOpenChange} title="Мой герой" description="Выбери героя">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {heroes.map((hero) => {
          const available = unlocked.includes(hero.id);
          const world = hero.unlockedBy ? worldById(hero.unlockedBy) : undefined;
          const hint = world ? `Пройди мир «${world.title}»` : '';
          return (
            <li key={hero.id}>
              <button
                type="button"
                aria-label={available ? hero.name : `${hero.name}. ${hint}`}
                aria-pressed={hero.id === current}
                onClick={() => {
                  if (!available) {
                    voice.say(`${hero.name} ждёт тебя. ${hint}!`);
                    return;
                  }
                  sfx.add();
                  voice.say(`Привет! Я ${hero.name}!`, { character: hero.id });
                  onPick(hero.id);
                }}
                className={cn(
                  'relative flex w-full flex-col items-center gap-1 rounded-3xl border-4 bg-surface p-3',
                  hero.id === current ? 'border-brand' : 'border-transparent',
                )}
              >
                <CharacterArt character={hero.id} className={cn('h-28 w-28', !available && 'opacity-30 grayscale')} />
                <span className="text-center text-base leading-tight font-extrabold">{hero.name}</span>
                {!available ? (
                  <>
                    <Lock aria-hidden className="absolute top-3 right-3 text-ink-soft" size={28} />
                    <span className="text-center text-sm text-ink-soft">{hint}</span>
                  </>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </KidDialog>
  );
}
