'use client';

import { Cat, Play, Rabbit, Square, StepForward, Turtle } from 'lucide-react';
import { KidButton } from '@/components/kid/kid-button';
import { updateSettings, useDeviceSettings, type DeviceSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';
import type { PlayerStatus } from './level-player';

/** One button cycles the speed — easier for small hands than a segmented control. */
interface SpeedOption {
  value: DeviceSettings['speed'];
  label: string;
  icon: typeof Cat;
}

const NORMAL: SpeedOption = { value: 1, label: 'обычно', icon: Cat };
const SPEEDS: SpeedOption[] = [
  { value: 0.5, label: 'медленно', icon: Turtle },
  NORMAL,
  { value: 2, label: 'быстро', icon: Rabbit },
];

export interface RunControlsProps {
  status: PlayerStatus;
  onPlay: () => void;
  onStop: () => void;
  onStep: () => void;
  className?: string;
}

/** Запуск, Стоп, Шаг and the speed switch (turtle 0.5×, cat 1×, rabbit 2×). */
export function RunControls({ status, onPlay, onStop, onStep, className }: RunControlsProps) {
  const { speed } = useDeviceSettings();
  const busy = status === 'running' || status === 'reacting';
  const active = status !== 'idle';
  const current = SPEEDS.find((option) => option.value === speed) ?? NORMAL;
  return (
    <div className={cn('flex items-center justify-center gap-2 sm:gap-3', className)}>
      <KidButton
        voiceLabel={status === 'stepping' ? 'Дальше без остановок' : 'Запуск'}
        icon={Play}
        tone="go"
        size="xl"
        round
        iconClassName="fill-white"
        disabled={busy || status === 'won'}
        onClick={onPlay}
      />
      <KidButton
        voiceLabel="Стоп"
        icon={Square}
        tone="calm"
        size="lg"
        round
        iconClassName="fill-white"
        disabled={!active}
        onClick={onStop}
      />
      <KidButton
        voiceLabel="Шаг"
        icon={StepForward}
        size="lg"
        round
        disabled={status === 'reacting' || status === 'won'}
        onClick={onStep}
      />
      <KidButton
        voiceLabel={`Скорость: ${current.label}`}
        icon={current.icon}
        round
        tone="sun"
        onClick={() => {
          const next = SPEEDS[(SPEEDS.indexOf(current) + 1) % SPEEDS.length] ?? NORMAL;
          updateSettings({ speed: next.value });
        }}
      />
    </div>
  );
}
