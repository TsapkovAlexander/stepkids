'use client';

import type { StarsRule } from '@stepkids/blocks';
import { ArrowRight, Map as MapIcon, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { CharacterArt } from '@/components/kid/art-image';
import { KidButton } from '@/components/kid/kid-button';
import { KidDialog } from '@/components/kid/kid-dialog';
import { Stars } from '@/components/kid/stars';
import { sfx } from '@/lib/audio/sfx';
import { voice } from '@/lib/voice/voice';

export interface VictoryDialogProps {
  stars: number;
  blocks: number;
  rule: StarsRule;
  heroId: string;
  hasNext: boolean;
  worldDone: boolean;
  onNext: () => void;
  onRetry: () => void;
  onMap: () => void;
}

/** What could still earn more stars, in words a child understands. */
export function improvementTip(stars: number, blocks: number, rule: StarsRule): string | null {
  if (stars >= 3) return null;
  const target = stars === 1 ? rule.two?.maxBlocks : rule.three?.maxBlocks;
  if (target && blocks > target)
    return `Попробуй решить короче: хватит ${target} ${target === 1 ? 'блока' : 'блоков'}!`;
  if (rule.three?.noBumps) return 'Попробуй пройти, ни во что не врезаясь!';
  return null;
}

export function VictoryDialog({
  stars,
  blocks,
  rule,
  heroId,
  hasNext,
  worldDone,
  onNext,
  onRetry,
  onMap,
}: VictoryDialogProps) {
  const tip = improvementTip(stars, blocks, rule);
  useEffect(() => {
    const timers = [0, 1, 2]
      .slice(0, stars)
      .map((index) => setTimeout(() => sfx.star(index), 250 + index * 220));
    const say = setTimeout(() => {
      const praise = worldDone
        ? 'Ура! Ты прошёл весь мир!'
        : stars === 3
          ? 'Три звезды! Отлично!'
          : `Звёзд: ${stars}.`;
      voice.say(tip ? `${praise} ${tip}` : praise, { character: heroId });
    }, 900);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(say);
    };
  }, [stars, tip, heroId, worldDone]);

  return (
    <KidDialog
      open
      onOpenChange={() => undefined}
      title={worldDone ? 'Мир пройден!' : 'Получилось!'}
      description={`Звёзд: ${stars} из 3`}
      hideClose
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <CharacterArt character={heroId} costume="party" className="h-36 w-36 animate-pop" />
        <Stars count={stars} size={64} animate />
        {tip ? <p className="text-lg font-extrabold text-ink-soft">{tip}</p> : null}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <KidButton voiceLabel="На карту" icon={MapIcon} round size="lg" onClick={onMap} />
          <KidButton
            voiceLabel="Ещё раз"
            icon={RotateCcw}
            round
            size="lg"
            tone="sun"
            onClick={onRetry}
          />
          {hasNext ? (
            <KidButton
              voiceLabel="Дальше"
              icon={ArrowRight}
              caption="Дальше"
              size="xl"
              tone="go"
              onClick={onNext}
            />
          ) : null}
        </div>
      </div>
    </KidDialog>
  );
}
