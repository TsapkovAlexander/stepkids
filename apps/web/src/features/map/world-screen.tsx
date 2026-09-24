'use client';

import { THEMES } from '@stepkids/stage/art';
import { Check, Lock, Map as MapIcon, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { KidButton } from '@/components/kid/kid-button';
import { Stars } from '@/components/kid/stars';
import { allWorlds, worldById } from '@/lib/content/catalog';
import { isLevelUnlocked, nextUnsolvedIndex, worldLock } from '@/lib/progress/unlocks';
import { useProgress } from '@/lib/use-progress';
import { useRequireProfile } from '@/lib/use-require-profile';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';

/** A world's levels as a winding path of big numbered stones. */
export function WorldScreen({ worldId }: { worldId: string }) {
  const router = useRouter();
  const profile = useRequireProfile();
  const progress = useProgress(profile?.id);
  const world = worldById(worldId);

  if (!world) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-2xl font-black">Такого мира нет</p>
        <KidButton voiceLabel="На карту" icon={MapIcon} caption="На карту" tone="brand" onClick={() => router.push('/play/map')} />
      </div>
    );
  }
  if (!profile || !progress) return <div className="flex-1 animate-pulse bg-white/30" aria-busy />;

  const lock = worldLock(world, allWorlds(), progress, profile);
  const current = nextUnsolvedIndex(world, progress);
  const theme = THEMES[world.island as keyof typeof THEMES] ?? THEMES.meadow;

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: `linear-gradient(${theme.sky}, ${theme.tileA})` }}>
      <header className="flex items-center gap-3 p-3 sm:p-4">
        <KidButton voiceLabel="На карту" icon={MapIcon} round tone="surface" onClick={() => router.push('/play/map')} />
        <h1 className="text-3xl font-black">{world.title}</h1>
        <KidButton voiceLabel={world.voice ?? world.title} icon={Volume2} round silent onClick={() => voice.say(world.voice ?? world.title)} />
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
        {!lock.unlocked ? (
          <p className="mt-10 text-center text-2xl font-black">Этот мир пока закрыт</p>
        ) : (
          <ol className="mx-auto grid max-w-3xl grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-5" aria-label="Задания">
            {world.levels.map((level, index) => {
              const open = isLevelUnlocked(world, index, progress, profile);
              const entry = progress.get(level.id);
              const solved = (entry?.bestStars ?? 0) > 0;
              const isCurrent = open && index === current && !solved;
              // Zig-zag: every other row shifts down so the path winds.
              const shift = Math.floor(index / 5) % 2 === 1 ? 'sm:translate-y-4' : '';
              return (
                <li key={level.id} className={cn('flex flex-col items-center gap-1', shift)}>
                  <button
                    type="button"
                    aria-label={open ? `Задание ${index + 1}` : `Задание ${index + 1}. Закрыто`}
                    onClick={() => {
                      if (!open) {
                        voice.say('Сначала пройди предыдущее задание.');
                        return;
                      }
                      voice.say(`Задание ${index + 1}`);
                      router.push(`/play/level/${level.id}`);
                    }}
                    className={cn(
                      'kid-press relative flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black sm:h-24 sm:w-24',
                      !open && 'bg-white/60 text-ink/40 [--press-edge:var(--color-line)]',
                      open && solved && 'bg-go text-white [--press-edge:var(--color-go-dark)]',
                      open && !solved && 'bg-surface text-ink [--press-edge:var(--color-line)]',
                      isCurrent && 'animate-pulse-soft ring-4 ring-hint',
                    )}
                  >
                    {open ? index + 1 : <Lock aria-hidden size={30} />}
                    {solved ? (
                      <Check aria-hidden size={22} strokeWidth={4} className="absolute -top-1 -right-1 rounded-full bg-sun p-0.5 text-ink" />
                    ) : null}
                  </button>
                  <Stars count={entry?.bestStars ?? 0} size={18} />
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
