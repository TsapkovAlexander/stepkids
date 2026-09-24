'use client';

import type { LevelContent, ProgramDoc } from '@stepkids/blocks';
import { costumesOf } from '@stepkids/content';
import type { RunResult } from '@stepkids/engine';
import type { GridStage, StageMarkers } from '@stepkids/stage';
import { useEffect, useRef, useState } from 'react';
import { sfx } from '@/lib/audio/sfx';
import { reactionLine } from '@/lib/progress/reaction';
import { voice } from '@/lib/voice/voice';
import { LevelPlayer, type PlayerState } from './level-player';

const INITIAL: PlayerState = { status: 'idle', activeIds: new Set(), oopsId: null };

/** React binding of {@link LevelPlayer}: one player per level, wired to voice and sounds. */
export function useLevelPlayer(options: {
  level: LevelContent;
  markers: StageMarkers;
  stage: GridStage | null;
  speed: number;
  onFinish: (result: RunResult, program: ProgramDoc) => void;
  sandbox?: boolean;
}) {
  const { level, markers, stage, speed, onFinish, sandbox = false } = options;
  const [state, setState] = useState<PlayerState>(INITIAL);
  const [player, setPlayer] = useState<LevelPlayer | null>(null);
  const finishRef = useRef(onFinish);
  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    let attempt = 0;
    const created = new LevelPlayer(level, markers, {
      costumes: costumesOf,
      speak: (text, character) => voice.say(text, { character })?.done ?? null,
      sound: (event, detail) => {
        if (event === 'melody') sfx.melody(detail ?? 'happy');
        else sfx[event]();
      },
      reaction: (result) => reactionLine(result, heroOf(level), attempt++),
      onState: setState,
      onFinish: (result, program) => finishRef.current(result, program),
      sandbox,
    });
    setPlayer(created);
    return () => {
      created.destroy();
      setPlayer(null);
      setState(INITIAL);
    };
  }, [level, markers, sandbox]);

  useEffect(() => {
    player?.attach(stage);
  }, [player, stage]);

  useEffect(() => {
    player?.setSpeed(speed);
  }, [player, speed]);

  return { state, player };
}

function heroOf(level: LevelContent): string {
  if (level.scene.kind !== 'grid') return 'kitten';
  return level.scene.actors.find((actor) => actor.id === 'hero')?.character ?? level.scene.actors[0]?.character ?? 'kitten';
}
