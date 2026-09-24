'use client';

import type { ProgramDoc } from '@stepkids/blocks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyRibbon, ensureRibbon } from '@/lib/ribbon/ops';
import { clearDraft, getDraft, saveDraft } from '@/lib/storage/progress';

const SAVE_DELAY_MS = 400;

/**
 * The child's program for a level: restored from the device draft, or the level's starter
 * program ("fix it" tasks), or an empty ribbon. Every change is saved as a draft.
 */
export function useLevelProgram(profileId: string | undefined, levelId: string, starter: ProgramDoc | undefined) {
  const [program, setProgramState] = useState<ProgramDoc | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    void getDraft(profileId, levelId).then((draft) => {
      if (!cancelled) setProgramState(ensureRibbon(draft ?? (starter ? structuredClone(starter) : emptyRibbon())));
    });
    return () => {
      cancelled = true;
    };
  }, [profileId, levelId, starter]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const setProgram = useCallback(
    (update: (current: ProgramDoc) => ProgramDoc) => {
      setProgramState((current) => {
        if (!current) return current;
        const next = update(current);
        if (profileId && next !== current) {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void saveDraft(profileId, levelId, next), SAVE_DELAY_MS);
        }
        return next;
      });
    },
    [profileId, levelId],
  );

  /** Back to the level's initial program. */
  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (profileId) void clearDraft(profileId, levelId);
    setProgramState(ensureRibbon(starter ? structuredClone(starter) : emptyRibbon()));
  }, [profileId, levelId, starter]);

  return { program, setProgram, reset };
}
