'use client';

import type { WorldSeed } from '@stepkids/blocks';
import { islandSvg, svgDataUrl } from '@stepkids/stage/art';
import { Lock, Star } from 'lucide-react';
import { useMemo } from 'react';
import type { WorldLock } from '@/lib/progress/unlocks';
import { cn } from '@/lib/utils';

export interface IslandCardProps {
  world: WorldSeed;
  lock: WorldLock;
  stars: number;
  maxStars: number;
  onOpen: () => void;
  className?: string;
}

export function IslandCard({ world, lock, stars, maxStars, onOpen, className }: IslandCardProps) {
  const src = useMemo(() => svgDataUrl(islandSvg(world.island)), [world.island]);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={
        lock.unlocked ? `${world.title}. Звёзд ${stars} из ${maxStars}` : `${world.title}. Закрыто`
      }
      className={cn(
        'group relative flex w-full max-w-80 flex-col items-center rounded-[32px] p-2 transition active:scale-95',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG art */}
      <img
        src={src}
        alt=""
        draggable={false}
        className={cn(
          'w-full select-none drop-shadow-lg',
          lock.unlocked ? 'animate-float' : 'opacity-60 grayscale-[0.7]',
        )}
      />
      <span className="-mt-3 rounded-full bg-surface px-4 py-1.5 text-xl font-black shadow-md">
        {world.title}
      </span>
      <span className="mt-2 flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-lg font-extrabold">
        {lock.unlocked ? (
          <>
            <Star aria-hidden size={22} className="fill-sun text-sun-dark" />
            {stars} / {maxStars}
          </>
        ) : (
          <>
            <Lock aria-hidden size={20} />
            {lock.starsNeeded > 0 ? (
              <>
                ещё {lock.starsNeeded}{' '}
                <Star aria-hidden size={20} className="fill-sun text-sun-dark" />
              </>
            ) : (
              'скоро'
            )}
          </>
        )}
      </span>
    </button>
  );
}
