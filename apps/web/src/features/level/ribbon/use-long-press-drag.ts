'use client';

import { useCallback, useRef, useState, type PointerEvent } from 'react';

const HOLD_MS = 380;
const SLOP_PX = 10;

export interface DragState {
  id: string;
  x: number;
  y: number;
}

/**
 * Long press lifts a block, then it follows the finger; a short tap stays a tap.
 * `resolveIndex` maps a pointer position to the drop index.
 */
export function useLongPressDrag(options: {
  enabled: boolean;
  onTap: (id: string) => void;
  onDrop: (id: string, index: number) => void;
  resolveIndex: (x: number, y: number) => number;
  onLift?: (id: string) => void;
}) {
  const { enabled, onTap, onDrop, resolveIndex, onLift } = options;
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const pending = useRef<{ id: string; x: number; y: number; timer: ReturnType<typeof setTimeout>; pointerId: number } | null>(null);
  const lifted = useRef(false);

  const cancel = () => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
  };

  const bind = useCallback(
    (id: string) => ({
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (!enabled || event.button !== 0) return;
        lifted.current = false;
        const target = event.currentTarget;
        const { clientX: x, clientY: y, pointerId } = event;
        const timer = setTimeout(() => {
          lifted.current = true;
          try {
            target.setPointerCapture(pointerId);
          } catch {
            // The pointer may already be gone.
          }
          setDrag({ id, x, y });
          setDropIndex(resolveIndex(x, y));
          onLift?.(id);
        }, HOLD_MS);
        pending.current = { id, x, y, timer, pointerId };
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const start = pending.current;
        if (!start) return;
        if (!lifted.current) {
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > SLOP_PX) cancel();
          return;
        }
        setDrag({ id: start.id, x: event.clientX, y: event.clientY });
        setDropIndex(resolveIndex(event.clientX, event.clientY));
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        const start = pending.current;
        cancel();
        if (!start) return;
        if (lifted.current) {
          onDrop(start.id, resolveIndex(event.clientX, event.clientY));
          setDrag(null);
          setDropIndex(null);
        } else {
          onTap(start.id);
        }
        lifted.current = false;
      },
      onPointerCancel: () => {
        cancel();
        lifted.current = false;
        setDrag(null);
        setDropIndex(null);
      },
      onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
    }),
    [enabled, onTap, onDrop, resolveIndex, onLift],
  );

  return { drag, dropIndex, bind };
}
