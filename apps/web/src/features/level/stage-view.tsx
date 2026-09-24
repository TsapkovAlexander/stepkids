'use client';

import { costumesOf } from '@stepkids/content';
import type { GridStage } from '@stepkids/stage';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const FONT = '"Nunito Variable", "Nunito", sans-serif';

/** Hosts the PixiJS stage; the renderer is loaded on the client only. */
export function StageView({
  onReady,
  onActorTap,
  onCellTap,
  className,
  label,
}: {
  onReady: (stage: GridStage | null) => void;
  onActorTap?: (actorId: string) => void;
  onCellTap?: (cell: { x: number; y: number }) => void;
  className?: string;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onReady, onActorTap, onCellTap });
  useEffect(() => {
    handlers.current = { onReady, onActorTap, onCellTap };
  });

  useEffect(() => {
    let cancelled = false;
    let stage: GridStage | null = null;
    void (async () => {
      const { GridStage: Stage } = await import('@stepkids/stage');
      await document.fonts?.ready;
      const element = host.current;
      if (!element || cancelled) return;
      const created = await Stage.create(element, {
        costumes: costumesOf,
        fontFamily: FONT,
        onActorTap: (id) => handlers.current.onActorTap?.(id),
        onCellTap: (cell) => handlers.current.onCellTap?.(cell),
      });
      if (cancelled) {
        created.destroy();
        return;
      }
      stage = created;
      handlers.current.onReady(created);
    })();
    return () => {
      cancelled = true;
      stage?.destroy();
      handlers.current.onReady(null);
    };
  }, []);

  return <div ref={host} role="img" aria-label={label} className={cn('relative min-h-0 overflow-hidden', className)} />;
}
