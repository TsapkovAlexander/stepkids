'use client';

import { speakBlock, type BlockCatalog, type BlockNode } from '@stepkids/blocks';
import { Flag } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { sfx } from '@/lib/audio/sfx';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';
import { BlockTile } from './block-tile';
import { useLongPressDrag } from './use-long-press-drag';

export interface RibbonEditorProps {
  blocks: BlockNode[];
  catalog: BlockCatalog;
  activeIds: ReadonlySet<string>;
  oopsId: string | null;
  /** Hint: a translucent block showing what goes next. */
  ghost: { index: number; block: BlockNode } | null;
  limit?: number;
  disabled?: boolean;
  onEdit: (blockId: string) => void;
  onMove: (blockId: string, index: number) => void;
  className?: string;
}

/** The program as a ribbon: green start flag, then blocks left to right, wrapping into rows. */
export function RibbonEditor({ blocks, catalog, activeIds, oopsId, ghost, limit, disabled, onEdit, onMove, className }: RibbonEditorProps) {
  const tiles = useRef(new Map<string, HTMLElement>());
  const scroller = useRef<HTMLDivElement>(null);

  const resolveIndex = useCallback(
    (x: number, y: number) => {
      const index = blocks.findIndex((block) => {
        const rect = tiles.current.get(block.id)?.getBoundingClientRect();
        return !!rect && y < rect.bottom && (y < rect.top || x < rect.left + rect.width / 2);
      });
      return index === -1 ? blocks.length : index;
    },
    [blocks],
  );

  const onTap = useCallback(
    (id: string) => {
      const block = blocks.find((entry) => entry.id === id);
      const def = block && catalog.get(block.type);
      if (!block || !def) return;
      sfx.tap();
      voice.say(speakBlock(def, block));
      onEdit(id);
    },
    [blocks, catalog, onEdit],
  );

  const onDrop = useCallback(
    (id: string, index: number) => {
      const from = blocks.findIndex((block) => block.id === id);
      // Dropping after itself means "stay"; indexes after the source shift by one.
      const target = from !== -1 && index > from ? index - 1 : index;
      if (target !== from) {
        sfx.add();
        onMove(id, target);
      }
    },
    [blocks, onMove],
  );

  const { drag, dropIndex, bind } = useLongPressDrag({ enabled: !disabled, onTap, onDrop, resolveIndex, onLift: () => sfx.step() });

  // Keep the running block in view.
  useEffect(() => {
    const [first] = activeIds;
    if (first) tiles.current.get(first)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [activeIds]);

  const sockets = limit ? Math.max(0, limit - blocks.length) : 0;
  const lifted = drag ? blocks.find((block) => block.id === drag.id) : undefined;
  const liftedDef = lifted ? catalog.get(lifted.type) : undefined;

  const items: Array<{ key: string; node: React.ReactNode }> = [];
  blocks.forEach((block, index) => {
    if (ghost && ghost.index === index) items.push({ key: 'ghost', node: <GhostTile catalog={catalog} block={ghost.block} /> });
    if (dropIndex === index && drag) items.push({ key: 'drop', node: <DropMark /> });
    const def = catalog.get(block.type);
    if (!def) return;
    items.push({
      key: block.id,
      node: (
        <BlockTile
          ref={(node) => {
            if (node) tiles.current.set(block.id, node);
            else tiles.current.delete(block.id);
          }}
          def={def}
          block={block}
          label={speakBlock(def, block)}
          active={activeIds.has(block.id)}
          oops={oopsId === block.id}
          className={cn(drag?.id === block.id && 'opacity-30', disabled && 'cursor-default')}
          {...bind(block.id)}
          onClick={(event) => {
            // Keyboard activation (Enter/Space) arrives as a click without pointer events.
            if (event.detail === 0 && !disabled) onTap(block.id);
          }}
        />
      ),
    });
  });
  if (ghost && ghost.index >= blocks.length) items.push({ key: 'ghost', node: <GhostTile catalog={catalog} block={ghost.block} /> });
  if (drag && dropIndex !== null && dropIndex >= blocks.length) items.push({ key: 'drop', node: <DropMark /> });

  return (
    <div
      ref={scroller}
      role="list"
      aria-label="Программа"
      className={cn('flex min-h-0 flex-wrap content-start items-center gap-3 overflow-y-auto rounded-3xl bg-white/70 p-3 shadow-inner', className)}
    >
      <button
        type="button"
        aria-label="Старт. Программа начинается здесь"
        onClick={() => voice.say('Старт. Программа начинается здесь')}
        className="flex h-block w-12 shrink-0 items-center justify-center rounded-l-[18px] rounded-r-md bg-cat-events text-white"
      >
        <Flag aria-hidden size={28} strokeWidth={3} />
      </button>
      {items.map((item) => (
        <div role="listitem" key={item.key} className="contents">
          {item.node}
        </div>
      ))}
      {Array.from({ length: sockets }, (_, index) => (
        <span
          key={`socket-${index}`}
          aria-hidden
          className="h-block w-block shrink-0 rounded-[18px] border-4 border-dashed border-ink/20 bg-white/40"
        />
      ))}
      {blocks.length === 0 && !ghost ? (
        <span className="px-2 text-lg font-bold text-ink-soft">Нажми на блок внизу</span>
      ) : null}
      {drag && lifted && liftedDef ? (
        <div className="pointer-events-none fixed z-(--z-toast)" style={{ left: drag.x - 38, top: drag.y - 38 }}>
          <BlockTile def={liftedDef} block={lifted} label="" lifted tabIndex={-1} />
        </div>
      ) : null}
    </div>
  );
}

function GhostTile({ catalog, block }: { catalog: BlockCatalog; block: BlockNode }) {
  const def = catalog.get(block.type);
  if (!def) return null;
  return <BlockTile def={def} block={block} label={`Подсказка: ${speakBlock(def, block)}`} ghost tabIndex={-1} onClick={() => voice.say(speakBlock(def, block))} />;
}

function DropMark() {
  return <span aria-hidden className="h-block w-2 shrink-0 rounded-full bg-brand" />;
}
