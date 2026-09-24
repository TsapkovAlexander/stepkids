'use client';

import { defaultCatalog, type LevelContent, type ProgramDoc } from '@stepkids/blocks';
import type { RunResult } from '@stepkids/engine';
import type { GridStage, StageMarkers } from '@stepkids/stage';
import { Lightbulb } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KidButton } from '@/components/kid/kid-button';
import {
  SEED_LEVEL_VERSION,
  levelById,
  nextLevelId,
  programmableActors,
  withHero,
  type LevelRef,
} from '@/lib/content/catalog';
import { failureCode } from '@/lib/progress/reaction';
import { isWorldCompleted, toProgressMap } from '@/lib/progress/unlocks';
import { useDeviceSettings } from '@/lib/settings';
import { progressOf, recordAttempt } from '@/lib/storage/progress';
import type { Profile } from '@/lib/storage/types';
import { useRequireProfile } from '@/lib/use-require-profile';
import { voice } from '@/lib/voice/voice';
import { ProgramPanel } from './program-panel';
import { RunControls } from './run-controls';
import { StageView } from './stage-view';
import { TaskBar } from './task-bar';
import { useHints } from './use-hints';
import { useLevelPlayer } from './use-level-player';
import { useLevelProgram } from './use-level-program';
import { VictoryDialog } from './victory-dialog';

export function LevelScreen({ levelId }: { levelId: string }) {
  const profile = useRequireProfile();
  const ref = levelById(levelId);
  const router = useRouter();
  if (!ref) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <KidButton
          voiceLabel="На карту"
          caption="Такого задания нет — на карту"
          tone="brand"
          onClick={() => router.push('/play/map')}
        />
      </div>
    );
  }
  if (!profile) return <div className="flex-1 animate-pulse bg-white/30" aria-busy />;
  return <LevelPlay key={`${ref.id}:${profile.heroId}`} levelRef={ref} profile={profile} />;
}

/** Goal markers the stage draws: targets without a flag and the picture to repeat. */
function markersOf(level: LevelContent): StageMarkers {
  const markers: StageMarkers = {};
  if (level.scene.kind !== 'grid') return markers;
  const items = level.scene.items;
  for (const goal of level.goals) {
    if (
      goal.kind === 'reach' &&
      !items.some((item) => item.kind === 'flag' && item.x === goal.x && item.y === goal.y)
    ) {
      (markers.reach ??= []).push({ x: goal.x, y: goal.y });
    }
    if (goal.kind === 'drawShape') markers.shape = goal.cells;
  }
  return markers;
}

function LevelPlay({ levelRef, profile }: { levelRef: LevelRef; profile: Profile }) {
  const router = useRouter();
  const level = useMemo(
    () => withHero(levelRef.content, profile.heroId),
    [levelRef.content, profile.heroId],
  );
  const markers = useMemo(() => markersOf(level), [level]);
  const { speed } = useDeviceSettings();
  const [stage, setStage] = useState<GridStage | null>(null);
  const actors = useMemo(() => programmableActors(level), [level]);
  const actorIds = useMemo(() => actors.map((actor) => actor.id), [actors]);
  const { program, setProgram, reset } = useLevelProgram(
    profile.id,
    levelRef.id,
    level.starterProgram,
    actorIds,
  );
  const hints = useHints(level, program);
  const [victory, setVictory] = useState<{
    stars: number;
    blocks: number;
    worldDone: boolean;
  } | null>(null);
  const openedAt = useRef(0);
  const hintsUsed = useRef(0);

  useEffect(() => {
    hintsUsed.current = hints.used;
  }, [hints.used]);

  // The condition is voiced when the task opens (spec: "При открытии задания").
  useEffect(() => {
    openedAt.current = Date.now();
    const timer = setTimeout(() => voice.say(level.taskText), 400);
    return () => {
      clearTimeout(timer);
      voice.stop();
    };
  }, [level.taskText]);

  const onFinish = useCallback(
    async (result: RunResult, ran: ProgramDoc) => {
      if (result.failure?.kind === 'empty') return;
      const now = Date.now();
      await recordAttempt({
        profileId: profile.id,
        levelId: levelRef.id,
        levelVersion: SEED_LEVEL_VERSION,
        program: ran,
        result: {
          success: result.success,
          blocks: result.blocks,
          steps: result.steps,
          bumps: result.bumps,
          timeMs: result.timeMs,
          failure: failureCode(result),
        },
        stars: result.stars,
        hintsUsed: hintsUsed.current,
        durationMs: now - openedAt.current,
      });
      openedAt.current = now;
      if (!result.success) {
        hints.registerFailure();
        return;
      }
      const progress = toProgressMap(await progressOf(profile.id));
      setVictory({
        stars: result.stars,
        blocks: result.blocks,
        worldDone:
          isWorldCompleted(levelRef.world, progress) &&
          levelRef.index === levelRef.world.levels.length - 1,
      });
    },
    [profile.id, levelRef, hints],
  );

  const { state, player } = useLevelPlayer({ level, markers, stage, speed, onFinish });
  const running = state.status !== 'idle';
  const blocks = useMemo(() => defaultCatalog.palette(level.allowedBlocks), [level.allowedBlocks]);
  const next = nextLevelId(levelRef.id);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] gap-2 p-2 sm:gap-3 sm:p-3 side:grid-cols-[minmax(0,1fr)_minmax(360px,42%)] side:grid-rows-[auto_minmax(0,1fr)_auto]">
      <TaskBar
        className="side:col-span-2"
        number={levelRef.index + 1}
        text={level.taskText}
        hintsLeft={hints.hintsLeft}
        hintsReady={hints.ready}
        onBack={() => router.push(`/play/world/${levelRef.world.id}`)}
        onReset={() => {
          player?.stop();
          reset();
        }}
        onHint={() => {
          const hint = hints.open();
          if (hint)
            voice.say(
              hint.kind === 'say' ? hint.text : (hint.text ?? 'Смотри, я подсвечу нужный блок.'),
            );
        }}
      />
      <div className="relative min-h-[34dvh] side:row-span-2 side:min-h-0">
        <StageView
          className="absolute inset-0 rounded-3xl"
          label={`Сцена: ${level.taskText}`}
          onReady={setStage}
          onActorTap={(actorId) => player?.tap(actorId)}
        />
        {hints.visible ? (
          <button
            type="button"
            onClick={hints.dismiss}
            className="absolute top-2 left-2 flex max-w-[80%] items-start gap-2 rounded-2xl bg-hint p-3 text-left text-lg font-extrabold shadow-lg"
            aria-label={`Подсказка: ${hints.visible.kind === 'say' ? hints.visible.text : (hints.visible.text ?? '')}. Закрыть`}
          >
            <Lightbulb aria-hidden className="shrink-0" />
            {hints.visible.kind === 'say'
              ? hints.visible.text
              : (hints.visible.text ?? 'Смотри на подсвеченный блок')}
          </button>
        ) : null}
      </div>
      <ProgramPanel
        program={program}
        setProgram={setProgram}
        blocks={blocks}
        actors={actors}
        limit={level.blockLimit}
        running={running}
        activeIds={state.activeIds}
        oopsId={state.oopsId}
        ghost={hints.ghost}
        highlight={hints.highlight}
        controls={
          <RunControls
            status={state.status}
            onPlay={() => program && player?.play(program)}
            onStop={() => player?.stop()}
            onStep={() => program && player?.step(program)}
          />
        }
      />
      {victory ? (
        <VictoryDialog
          stars={victory.stars}
          blocks={victory.blocks}
          rule={level.stars}
          heroId={profile.heroId}
          hasNext={!!next}
          worldDone={victory.worldDone}
          onNext={() =>
            router.push(next ? `/play/level/${next}` : `/play/world/${levelRef.world.id}`)
          }
          onRetry={() => {
            setVictory(null);
            player?.stop();
          }}
          onMap={() => router.push(`/play/world/${levelRef.world.id}`)}
        />
      ) : null}
    </div>
  );
}
