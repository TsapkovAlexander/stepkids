'use client';

import { TIERS_META } from '@stepkids/content';
import { useLiveQuery } from 'dexie-react-hooks';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { allWorlds, worldById, worldsOfTier } from '@/lib/content/catalog';
import {
  isTierUnlocked,
  maxStarsOfWorld,
  starsOfWorld,
  unlockedHeroes,
  worldLock,
} from '@/lib/progress/unlocks';
import { markRewardSeen, seenRewards } from '@/lib/storage/progress';
import { updateProfile } from '@/lib/storage/profiles';
import { useProgress } from '@/lib/use-progress';
import { useRequireProfile } from '@/lib/use-require-profile';
import { voice } from '@/lib/voice/voice';
import { HeroPicker } from './hero-picker';
import { IslandCard } from './island-card';
import { NewHeroDialog } from './new-hero-dialog';
import { MapTopBar } from './top-bar';

export function MapScreen() {
  const router = useRouter();
  const profile = useRequireProfile();
  const progress = useProgress(profile?.id);
  const seen = useLiveQuery(
    async (): Promise<string[]> => (profile ? seenRewards(profile.id) : []),
    [profile?.id],
    undefined,
  );
  const [heroOpen, setHeroOpen] = useState(false);
  const worlds = allWorlds();

  const heroes = useMemo(
    () => (progress ? unlockedHeroes(worlds, progress) : []),
    [progress, worlds],
  );
  const newHero = seen
    ? heroes.find((hero) => hero.unlockedBy && !seen.includes(`hero:${hero.id}`))
    : undefined;

  if (!profile || !progress) {
    return <div className="flex-1 animate-pulse bg-white/30" aria-busy />;
  }

  const totalStars = worlds.reduce((sum, world) => sum + starsOfWorld(world, progress), 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MapTopBar profile={profile} stars={totalStars} onHero={() => setHeroOpen(true)} />
      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {TIERS_META.map((tier) => {
          const tierWorlds = worldsOfTier(tier.id, worlds);
          const open = isTierUnlocked(tier.id, worlds, progress, profile) && tierWorlds.length > 0;
          return (
            <section
              key={tier.id}
              aria-label={`Ступень ${tier.id}: ${tier.title}`}
              className="mb-6"
            >
              <h2 className="mb-2 flex items-center gap-2 text-2xl font-black text-ink">
                <span className="rounded-full bg-brand px-3 py-0.5 text-white">{tier.id}</span>
                {tier.title}
                {!open ? <Lock aria-hidden size={22} className="text-ink-soft" /> : null}
              </h2>
              {open ? (
                <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-8">
                  {tierWorlds.map((world, index) => {
                    const lock = worldLock(world, worlds, progress, profile);
                    return (
                      <IslandCard
                        key={world.id}
                        world={world}
                        lock={lock}
                        stars={starsOfWorld(world, progress)}
                        maxStars={maxStarsOfWorld(world)}
                        className={index % 2 === 1 ? 'sm:mt-16' : ''}
                        onOpen={() => {
                          if (lock.unlocked) {
                            voice.say(world.voice ?? world.title);
                            router.push(`/play/world/${world.id}`);
                          } else if (lock.starsNeeded > 0) {
                            voice.say(
                              `${world.title}. Чтобы открыть этот мир, собери ещё ${lock.starsNeeded} звёзд.`,
                            );
                          } else {
                            const after = lock.afterWorld
                              ? worldById(lock.afterWorld)?.title
                              : null;
                            voice.say(
                              after
                                ? `Сначала пройди мир ${after}.`
                                : `${world.title} скоро откроется.`,
                            );
                          }
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => voice.say(`${tier.voice}. Скоро откроется!`)}
                  className="flex min-h-target w-full items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-white bg-white/40 p-4 text-xl font-extrabold text-ink-soft"
                >
                  <Lock aria-hidden size={24} />
                  Скоро откроется
                </button>
              )}
            </section>
          );
        })}
      </main>
      <HeroPicker
        open={heroOpen}
        onOpenChange={setHeroOpen}
        current={profile.heroId}
        unlocked={heroes.map((hero) => hero.id)}
        onPick={(heroId) => {
          void updateProfile(profile.id, { heroId });
          setHeroOpen(false);
        }}
      />
      {newHero ? (
        <NewHeroDialog
          hero={newHero}
          onClose={() => void markRewardSeen(profile.id, `hero:${newHero.id}`)}
          onPlay={() => {
            void markRewardSeen(profile.id, `hero:${newHero.id}`);
            void updateProfile(profile.id, { heroId: newHero.id });
          }}
        />
      ) : null}
    </div>
  );
}
