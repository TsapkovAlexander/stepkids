'use client';

import {
  START_BLOCK,
  speakBlock,
  type BlockCatalog,
  type BlockNode,
  type ProgramDoc,
} from '@stepkids/blocks';
import { Flag, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CharacterArt } from '@/components/kid/art-image';
import { radioTabIndex, rovingRadioKeyDown } from '@/components/kid/roving';
import { sfx } from '@/lib/audio/sfx';
import { laneKey, scriptsOf, type LaneRef } from '@/lib/ribbon/ops';
import { cn } from '@/lib/utils';
import { voice } from '@/lib/voice/voice';
import { BlockTile } from './block-tile';
import { EditorContext, LaneView, type DropTarget, type EditorContextValue } from './lane-view';
import { useLongPressDrag } from './use-long-press-drag';

export interface ProgramActor {
  id: string;
  character: string;
  name: string;
}

export interface ProgramEditorProps {
  program: ProgramDoc;
  catalog: BlockCatalog;
  actors: ProgramActor[];
  target: string;
  onTarget: (actorId: string) => void;
  allowScripts: boolean;
  activeIds: ReadonlySet<string>;
  oopsId: string | null;
  ghost: { lane: LaneRef; index: number; block: BlockNode } | null;
  selectedLane: LaneRef | null;
  onSelectLane: (lane: LaneRef) => void;
  disabled: boolean;
  onEdit: (blockId: string) => void;
  onMove: (blockId: string, lane: LaneRef, index: number) => void;
  onAddScript: () => void;
  sockets?: number;
  className?: string;
}

function parseLane(key: string): LaneRef | null {
  const [target, scriptId, parent, stack] = key.split('/');
  if (!target || !scriptId || !parent || !stack) return null;
  return { target, scriptId, parentId: parent === 'root' ? null : parent, stack };
}

/** Finds the innermost lane under the pointer and the insertion index inside it. */
function resolveDrop(x: number, y: number): DropTarget | null {
  const laneElement = document
    .elementsFromPoint(x, y)
    .map((element) => element.closest<HTMLElement>('[data-lane]'))
    .find((element): element is HTMLElement => !!element);
  const key = laneElement?.dataset.lane;
  const lane = key ? parseLane(key) : null;
  if (!laneElement || !lane) return null;
  const items = [...laneElement.querySelectorAll<HTMLElement>(':scope > [role="listitem"]')];
  const index = items.findIndex((item) => {
    const box = (
      item.dataset.wrapper ? item : (item.firstElementChild ?? item)
    ).getBoundingClientRect();
    return y < box.bottom && (y < box.top || x < box.left + box.width / 2);
  });
  return { lane, index: index === -1 ? items.length : index };
}

/**
 * Ribbon editor for tiers 1–2: one lane per script, wrappers as brackets, tabs per actor.
 * Tap a block to edit it; hold it to drag between lanes; tap an empty lane to add there.
 */
export function ProgramEditor(props: ProgramEditorProps) {
  const { program, catalog, actors, target, allowScripts, disabled, onEdit, onMove } = props;
  const tiles = useRef(new Map<string, HTMLElement>());
  const scripts = scriptsOf(program, target);

  const onTap = useCallback(
    (id: string) => {
      sfx.tap();
      onEdit(id);
    },
    [onEdit],
  );
  const onDrop = useCallback(
    (id: string, drop: DropTarget) => {
      sfx.add();
      onMove(id, drop.lane, drop.index);
    },
    [onMove],
  );
  const {
    drag,
    target: drop,
    bind,
  } = useLongPressDrag<DropTarget>({
    enabled: !disabled,
    onTap,
    onDrop,
    resolve: resolveDrop,
    onLift: () => sfx.step(),
  });

  useEffect(() => {
    const [first] = props.activeIds;
    if (first)
      tiles.current
        .get(first)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [props.activeIds]);

  const context: EditorContextValue = useMemo(
    () => ({
      catalog,
      activeIds: props.activeIds,
      oopsId: props.oopsId,
      disabled,
      selectedLane: props.selectedLane ? laneKey(props.selectedLane) : null,
      dragId: drag?.id ?? null,
      drop,
      ghost: props.ghost
        ? { lane: laneKey(props.ghost.lane), index: props.ghost.index, block: props.ghost.block }
        : null,
      bind,
      registerTile: (id, element) => {
        if (element) tiles.current.set(id, element);
        else tiles.current.delete(id);
      },
      onSelectLane: (lane) => {
        sfx.tap();
        props.onSelectLane(lane);
      },
      onKeyboardEdit: onEdit,
    }),
    [catalog, props, disabled, drag?.id, drop, bind, onEdit],
  );

  const dragged = drag ? findBlock(program, drag.id) : undefined;
  const draggedDef = dragged ? catalog.get(dragged.type) : undefined;

  return (
    <EditorContext.Provider value={context}>
      <div
        className={cn(
          'flex min-h-0 flex-col gap-2 overflow-y-auto rounded-3xl bg-white/70 p-3 shadow-inner',
          props.className,
        )}
      >
        {actors.length > 1 ? (
          <div
            role="radiogroup"
            aria-label="Чья программа"
            onKeyDown={rovingRadioKeyDown}
            className="flex flex-wrap gap-2"
          >
            {actors.map((actor, index) => (
              <button
                key={actor.id}
                type="button"
                role="radio"
                aria-checked={actor.id === target}
                aria-label={`Программа: ${actor.name}`}
                tabIndex={radioTabIndex(
                  index,
                  actors.findIndex((entry) => entry.id === target),
                )}
                onClick={() => {
                  voice.say(`Программа: ${actor.name}`);
                  props.onTarget(actor.id);
                }}
                className={cn(
                  'flex h-target items-center gap-1 rounded-full border-4 bg-surface pr-3',
                  actor.id === target ? 'border-brand' : 'border-transparent',
                )}
              >
                <CharacterArt character={actor.character} className="h-12 w-12" />
                <span className="text-base font-extrabold">{actor.name}</span>
              </button>
            ))}
          </div>
        ) : null}
        {scripts.map((script) => {
          const hat = script.blocks[0];
          const hatDef = hat ? catalog.get(hat.type) : undefined;
          const lane: LaneRef = { target, scriptId: script.id, parentId: null, stack: 'body' };
          return (
            <div key={script.id} className="flex items-start gap-2">
              {hat && hat.type === START_BLOCK ? (
                <button
                  type="button"
                  aria-label="Когда старт. Программа начинается здесь"
                  onClick={() =>
                    allowScripts ? onEdit(hat.id) : voice.say('Старт. Программа начинается здесь')
                  }
                  className="flex h-block w-12 shrink-0 items-center justify-center rounded-l-[18px] rounded-r-md bg-cat-events text-white"
                >
                  <Flag aria-hidden size={28} strokeWidth={3} />
                </button>
              ) : hat && hatDef ? (
                <BlockTile
                  def={hatDef}
                  block={hat}
                  label={speakBlock(hatDef, hat)}
                  className="rounded-r-md"
                  onClick={() => onEdit(hat.id)}
                />
              ) : null}
              <LaneView
                lane={lane}
                blocks={script.blocks.slice(1)}
                placeholder={allowScripts ? 'Нажми на блок внизу' : undefined}
                className="flex-1"
              />
            </div>
          );
        })}
        {props.sockets ? (
          <div aria-hidden className="flex flex-wrap gap-3 pl-14">
            {Array.from({ length: props.sockets }, (_, index) => (
              <span
                key={index}
                className="h-block w-block rounded-[18px] border-4 border-dashed border-ink/20 bg-white/40"
              />
            ))}
          </div>
        ) : null}
        {allowScripts ? (
          <button
            type="button"
            disabled={disabled}
            onClick={props.onAddScript}
            aria-label="Добавить ещё одну программу"
            className="flex min-h-target items-center justify-center gap-2 self-start rounded-2xl border-4 border-dashed border-cat-events px-4 text-lg font-extrabold text-ink-soft disabled:opacity-50"
          >
            <Plus aria-hidden size={24} />
            Ещё программа
          </button>
        ) : null}
        {!allowScripts && scripts.every((script) => script.blocks.length <= 1) && !props.ghost ? (
          <span className="pl-14 text-lg font-bold text-ink-soft">Нажми на блок внизу</span>
        ) : null}
      </div>
      {drag && dragged && draggedDef ? (
        <div
          className="pointer-events-none fixed z-(--z-toast)"
          style={{ left: drag.x - 38, top: drag.y - 38 }}
        >
          <BlockTile def={draggedDef} block={dragged} label="" lifted tabIndex={-1} />
        </div>
      ) : null}
    </EditorContext.Provider>
  );
}

function findBlock(program: ProgramDoc, id: string): BlockNode | undefined {
  let found: BlockNode | undefined;
  const visit = (blocks: BlockNode[]) => {
    for (const block of blocks) {
      if (found) return;
      if (block.id === id) found = block;
      for (const stack of Object.values(block.stacks ?? {})) visit(stack);
    }
  };
  for (const entry of program.targets) for (const script of entry.scripts) visit(script.blocks);
  return found;
}
