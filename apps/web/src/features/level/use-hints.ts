'use client';

import type { Hint, LevelContent, ProgramDoc } from '@stepkids/blocks';
import { useCallback, useMemo, useState } from 'react';
import { nextStepHint, type NextStepHint } from '@/lib/ribbon/hints';

/** Hints open after two unsuccessful runs and escalate: a tip, a highlighted block, the next step. */
export const FAILURES_BEFORE_HINTS = 2;

export function useHints(level: LevelContent, program: ProgramDoc | null) {
  const [failures, setFailures] = useState(0);
  const [opened, setOpened] = useState(0);
  const [visible, setVisible] = useState<Hint | null>(null);

  const ready = failures >= FAILURES_BEFORE_HINTS;
  const hintsLeft = level.hints.length - opened;

  const open = useCallback((): Hint | null => {
    const hint = level.hints[opened] ?? level.hints[level.hints.length - 1] ?? null;
    setOpened((count) => Math.min(level.hints.length, count + 1));
    setVisible(hint);
    return hint;
  }, [level.hints, opened]);

  const stepShown = level.hints.slice(0, opened).some((hint) => hint.kind === 'showStep');
  const highlight = useMemo(() => {
    const highlighted = level.hints.slice(0, opened).find((hint) => hint.kind === 'highlight');
    return highlighted?.kind === 'highlight' ? highlighted.blockType : null;
  }, [level.hints, opened]);

  const ghost: NextStepHint | null = useMemo(
    () => (stepShown && program ? nextStepHint(program, level.reference) : null),
    [stepShown, program, level.reference],
  );

  return {
    ready,
    hintsLeft,
    used: opened,
    visible,
    highlight: highlight ?? ghost?.block.type ?? null,
    ghost,
    open,
    dismiss: () => setVisible(null),
    registerFailure: () => setFailures((count) => count + 1),
  };
}
