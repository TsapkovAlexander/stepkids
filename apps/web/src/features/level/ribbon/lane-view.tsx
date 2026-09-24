'use client';

import { speakBlock, type BlockCatalog, type BlockNode } from '@stepkids/blocks';
import { createContext, useContext, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';
import { laneKey, type LaneRef } from '@/lib/ribbon/ops';
import { categoryStyle } from './block-style';
import { BlockTile } from './block-tile';

export interface DropTarget {
  lane: LaneRef;
  index: number;
}

type PointerHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
  onContextMenu: (event: { preventDefault: () => void }) => void;
};

export interface EditorContextValue {
  catalog: BlockCatalog;
  activeIds: ReadonlySet<string>;
  oopsId: string | null;
  disabled: boolean;
  selectedLane: string | null;
  dragId: string | null;
  drop: DropTarget | null;
  ghost: { lane: string; index: number; block: BlockNode } | null;
  bind: (id: string) => PointerHandlers;
  registerTile: (id: string, element: HTMLElement | null) => void;
  onSelectLane: (lane: LaneRef) => void;
  onKeyboardEdit: (id: string) => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

function useEditor(): EditorContextValue {
  const value = useContext(EditorContext);
  if (!value) throw new Error('LaneView must be inside EditorContext');
  return value;
}

/**
 * A lane of blocks: the body of a script or the inside of a wrapper. Tapping the empty part
 * of a lane makes it the place where new blocks go; wrappers render their inner lanes.
 */
export function LaneView({
  lane,
  blocks,
  placeholder,
  className,
}: {
  lane: LaneRef;
  blocks: BlockNode[];
  placeholder?: string;
  className?: string;
}) {
  const editor = useEditor();
  const key = laneKey(lane);
  const selected = editor.selectedLane === key;
  const items: ReactNode[] = [];

  blocks.forEach((block, index) => {
    if (editor.ghost?.lane === key && editor.ghost.index === index)
      items.push(<Ghost key="ghost" block={editor.ghost.block} />);
    if (editor.drop && laneKey(editor.drop.lane) === key && editor.drop.index === index)
      items.push(<DropMark key="drop" />);
    items.push(<BlockView key={block.id} block={block} lane={lane} />);
  });
  if (editor.ghost?.lane === key && editor.ghost.index >= blocks.length)
    items.push(<Ghost key="ghost" block={editor.ghost.block} />);
  if (editor.drop && laneKey(editor.drop.lane) === key && editor.drop.index >= blocks.length)
    items.push(<DropMark key="drop" />);

  return (
    <div
      data-lane={key}
      role="list"
      onClick={(event) => {
        if (event.target === event.currentTarget && !editor.disabled) editor.onSelectLane(lane);
      }}
      className={cn(
        'flex min-h-block min-w-20 flex-wrap content-start items-center gap-3 rounded-2xl p-1 transition-shadow',
        selected && 'shadow-[0_0_0_4px_var(--color-brand)]',
        className,
      )}
    >
      {items}
      {blocks.length === 0 && placeholder ? (
        <button
          type="button"
          onClick={() => {
            editor.onSelectLane(lane);
            voice.say(placeholder);
          }}
          className="flex min-h-block items-center rounded-2xl border-4 border-dashed border-ink/20 px-3 text-base font-bold text-ink-soft"
        >
          {placeholder}
        </button>
      ) : null}
    </div>
  );
}

function BlockView({ block, lane }: { block: BlockNode; lane: LaneRef }) {
  const editor = useEditor();
  const def = editor.catalog.get(block.type);
  if (!def) return null;
  const tile = (
    <BlockTile
      ref={(node) => editor.registerTile(block.id, node)}
      data-block-lane={laneKey(lane)}
      def={def}
      block={block}
      label={speakBlock(def, block)}
      active={editor.activeIds.has(block.id)}
      oops={editor.oopsId === block.id}
      className={cn(editor.dragId === block.id && 'opacity-30')}
      {...editor.bind(block.id)}
      onClick={(event) => {
        // Keyboard activation (Enter/Space) arrives as a click without pointer events.
        if (event.detail === 0 && !editor.disabled) editor.onKeyboardEdit(block.id);
      }}
    />
  );
  if (def.shape !== 'wrapper')
    return (
      <div role="listitem" className="contents">
        {tile}
      </div>
    );
  // A wrapper is a bracket around its blocks: header tile, inner lane, closing edge.
  return (
    <div
      role="listitem"
      data-wrapper={block.id}
      className="flex items-stretch gap-2 rounded-[22px] border-4 p-1.5"
      style={{
        borderColor: `var(--color-cat-${def.category})`,
        background: 'rgb(255 255 255 / 0.55)',
      }}
    >
      {tile}
      {(def.stacks ?? []).map((stack) => (
        <LaneView
          key={stack}
          lane={{ ...lane, parentId: block.id, stack }}
          blocks={block.stacks?.[stack] ?? []}
          placeholder="Положи сюда"
          className="flex-1"
        />
      ))}
      <span aria-hidden className="w-3 shrink-0 rounded-r-xl" style={categoryStyle(def.category)} />
    </div>
  );
}

function Ghost({ block }: { block: BlockNode }) {
  const editor = useEditor();
  const def = editor.catalog.get(block.type);
  if (!def) return null;
  return (
    <BlockTile
      def={def}
      block={block}
      label={`Подсказка: ${speakBlock(def, block)}`}
      ghost
      tabIndex={-1}
      onClick={() => voice.say(speakBlock(def, block))}
    />
  );
}

function DropMark() {
  return <span aria-hidden className="h-block w-2 shrink-0 rounded-full bg-brand" />;
}
