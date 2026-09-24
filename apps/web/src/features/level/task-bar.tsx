'use client';

import { Lightbulb, Map as MapIcon, RotateCcw, Volume2 } from 'lucide-react';
import { KidButton } from '@/components/kid/kid-button';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';

export interface TaskBarProps {
  number: number;
  text: string;
  hintsLeft: number;
  hintsReady: boolean;
  onBack: () => void;
  onHint: () => void;
  onReset: () => void;
  className?: string;
}

/** Task condition with its voice button, the way back, a fresh start and the hint lamp. */
export function TaskBar({
  number,
  text,
  hintsLeft,
  hintsReady,
  onBack,
  onHint,
  onReset,
  className,
}: TaskBarProps) {
  return (
    <header className={cn('flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3', className)}>
      <KidButton voiceLabel="К заданиям" icon={MapIcon} round onClick={onBack} />
      <button
        type="button"
        onClick={() => voice.say(text)}
        aria-label={`Задание ${number}. ${text}`}
        className="kid-press order-last flex min-h-target min-w-0 basis-full items-center gap-3 rounded-kid bg-surface px-3 py-2 text-left [--press-edge:var(--color-line)] sm:order-none sm:flex-1 sm:basis-auto"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-black text-white">
          {number}
        </span>
        <span className="line-clamp-2 min-w-0 flex-1 text-lg leading-tight font-extrabold sm:text-xl">
          {text}
        </span>
        <Volume2 aria-hidden size={28} className="shrink-0 text-brand" />
      </button>
      <span className="flex-1 sm:hidden" aria-hidden />
      <KidButton voiceLabel="Начать сначала" icon={RotateCcw} round onClick={onReset} />
      <KidButton
        voiceLabel={hintsReady ? 'Подсказка' : 'Подсказка появится, если не получится два раза'}
        icon={Lightbulb}
        round
        tone={hintsReady && hintsLeft > 0 ? 'hint' : 'surface'}
        className={cn(hintsReady && hintsLeft > 0 && 'animate-pulse-soft')}
        silent={hintsReady && hintsLeft > 0}
        aria-disabled={!hintsReady || hintsLeft === 0}
        onClick={() => {
          if (hintsReady && hintsLeft > 0) onHint();
        }}
      />
    </header>
  );
}
