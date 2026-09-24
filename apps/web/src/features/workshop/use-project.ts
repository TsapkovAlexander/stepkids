'use client';

import type { GridSceneInput, ProgramDoc } from '@stepkids/blocks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureRibbon } from '@/lib/ribbon/ops';
import { getProject, saveProject } from '@/lib/storage/projects';
import type { Project } from '@/lib/storage/types';

const SAVE_DELAY_MS = 500;

/** A Workshop project with autosave (spec: "Проект сохраняется автоматически"). */
export function useProject(id: string) {
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const pending = useRef<Partial<Pick<Project, 'scene' | 'program' | 'title' | 'sharedAt'>>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getProject(id).then((loaded) => {
      if (!cancelled) setProject(loaded ? { ...loaded, program: ensureRibbon(loaded.program) } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length > 0) void saveProject(id, patch);
  }, [id]);

  useEffect(() => flush, [flush]);

  const update = useCallback(
    (patch: Partial<Pick<Project, 'scene' | 'program' | 'title' | 'sharedAt'>>) => {
      setProject((current) => (current ? { ...current, ...patch } : current));
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
    },
    [flush],
  );

  const setScene = useCallback((scene: GridSceneInput) => update({ scene }), [update]);
  const setProgram = useCallback(
    (change: (current: ProgramDoc) => ProgramDoc) => {
      setProject((current) => {
        if (!current) return current;
        const program = change(current.program);
        pending.current = { ...pending.current, program };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, SAVE_DELAY_MS);
        return { ...current, program };
      });
    },
    [flush],
  );

  return { project, setScene, setProgram, update, flush };
}
