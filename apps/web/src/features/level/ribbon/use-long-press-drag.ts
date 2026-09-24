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
 * `resolve` maps a pointer position to a drop target (a lane and an index) or null.
 */
export function useLongPressDrag<T>(options: {
  enabled: boolean;
  onTap: (id: string) => void;
  onDrop: (id: string, target: T) => void;
  resolve: (x: number, y: number) => T | null;
  onLift?: (id: string) => void;
}) {
  const { enabled, onTap, onDrop, resolve, onLift } = options;
  const [drag, setDrag] = useState<DragState | null>(null);
  const [target, setTarget] = useState<T | null>(null);
  const pending = useRef<{
    id: string;
    x: number;
    y: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const lifted = useRef(false);

  const cancel = () => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
  };

  const finish = () => {
    lifted.current = false;
    setDrag(null);
    setTarget(null);
  };

  const bind = useCallback(
    (id: string) => ({
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (!enabled || event.button !== 0) return;
        // Nested blocks sit inside wrapper blocks: only the innermost one reacts.
        event.stopPropagation();
        lifted.current = false;
        const element = event.currentTarget;
        const { clientX: x, clientY: y, pointerId } = event;
        const timer = setTimeout(() => {
          lifted.current = true;
          try {
            element.setPointerCapture(pointerId);
          } catch {
            // The pointer may already be gone.
          }
          setDrag({ id, x, y });
          setTarget(resolve(x, y));
          onLift?.(id);
        }, HOLD_MS);
        pending.current = { id, x, y, timer };
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const start = pending.current;
        if (!start || start.id !== id) return;
        if (!lifted.current) {
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > SLOP_PX) cancel();
          return;
        }
        setDrag({ id, x: event.clientX, y: event.clientY });
        setTarget(resolve(event.clientX, event.clientY));
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        const start = pending.current;
        if (!start || start.id !== id) return;
        event.stopPropagation();
        cancel();
        if (lifted.current) {
          const drop = resolve(event.clientX, event.clientY);
          if (drop) onDrop(id, drop);
          finish();
        } else {
          onTap(id);
        }
      },
      onPointerCancel: () => {
        cancel();
        finish();
      },
      onContextMenu: (event: { preventDefault: () => void }) => event.preventDefault(),
    }),
    [enabled, onTap, onDrop, resolve, onLift],
  );

  return { drag, target, bind };
}
