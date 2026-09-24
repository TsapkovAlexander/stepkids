'use client';

import {
  START_BLOCK,
  defaultCatalog,
  speakBlock,
  type BlockDef,
  type BlockNode,
  type ChoiceOption,
  type ProgramDoc,
} from '@stepkids/blocks';
import { characterById } from '@stepkids/content';
import { useMemo, useState, type ReactNode } from 'react';
import { sfx } from '@/lib/audio/sfx';
import {
  addScript,
  blockPosition,
  countPlaced,
  insertBlock,
  laneBlocks,
  mainLane,
  moveBlock,
  removeBlock,
  removeScript,
  updateArg,
  type LaneRef,
} from '@/lib/ribbon/ops';
import { voice } from '@/lib/voice/voice';
import { AddScriptDialog } from './ribbon/add-script-dialog';
import { BlockEditDialog, type EditActions } from './ribbon/block-edit-dialog';
import { Palette } from './ribbon/palette';
import { ProgramEditor, type ProgramActor } from './ribbon/program-editor';

export interface ProgramPanelProps {
  program: ProgramDoc | null;
  setProgram: (update: (current: ProgramDoc) => ProgramDoc) => void;
  /** Allowed blocks of the level, hats included. */
  blocks: BlockDef[];
  actors: ProgramActor[];
  limit?: number;
  running: boolean;
  activeIds: ReadonlySet<string>;
  oopsId: string | null;
  /** Hint: the next block of the main ribbon. */
  ghost: { index: number; block: BlockNode } | null;
  highlight: string | null;
  controls: ReactNode;
}

/** Run controls, the program editor and the palette, with dialogs for editing blocks and scripts. */
export function ProgramPanel({
  program,
  setProgram,
  blocks,
  actors,
  limit,
  running,
  activeIds,
  oopsId,
  ghost,
  highlight,
  controls,
}: ProgramPanelProps) {
  const [target, setTarget] = useState(actors[0]?.id ?? 'hero');
  const [selected, setSelected] = useState<LaneRef | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingScript, setAddingScript] = useState(false);
  const palette = useMemo(() => blocks.filter((def) => def.shape !== 'hat'), [blocks]);
  // Extra scripts start with an event; "when start" is offered too when several actors act.
  const hats = useMemo(
    () =>
      blocks.filter(
        (def) => def.shape === 'hat' && (def.type !== START_BLOCK || actors.length > 1),
      ),
    [blocks, actors.length],
  );
  const allowScripts =
    blocks.some((def) => def.shape === 'hat' && def.type !== START_BLOCK) || actors.length > 1;

  if (!program)
    return <section aria-busy className="min-h-40 animate-pulse rounded-3xl bg-white/50" />;

  const main = mainLane(program, target);
  const lane =
    selected && selected.target === target && laneExists(program, selected) ? selected : main;
  const placed = countPlaced(program);
  const full = limit !== undefined && placed >= limit;
  const heroLane = mainLane(program, actors[0]?.id ?? 'hero');

  const add = (def: BlockDef) => {
    if (running) return voice.say('Сначала нажми «Стоп»');
    if (full) return voice.say(`Больше блоков нельзя. Здесь хватит ${limit}.`);
    if (!lane) return;
    sfx.add();
    voice.say(def.voice);
    setProgram((current) => insertBlock(current, defaultCatalog.create(def.type), lane));
  };

  const editing = editingId ? findBlock(program, editingId) : undefined;
  const editingDef = editing ? defaultCatalog.get(editing.type) : undefined;
  const actions = editing
    ? editActions(program, editing, setProgram, () => setEditingId(null))
    : null;

  return (
    <section
      aria-label="Программа и блоки"
      className="flex min-h-0 flex-col gap-2 side:col-start-2 side:row-span-2 side:row-start-2 sm:gap-3"
    >
      <div className="side:order-3">{controls}</div>
      <ProgramEditor
        className="max-h-[30dvh] side:order-1 side:max-h-none side:flex-1"
        program={program}
        catalog={defaultCatalog}
        actors={actors}
        target={target}
        onTarget={(id) => {
          setTarget(id);
          setSelected(null);
        }}
        allowScripts={allowScripts}
        activeIds={activeIds}
        oopsId={oopsId}
        ghost={ghost && heroLane ? { lane: heroLane, ...ghost } : null}
        selectedLane={allowScripts || lane !== main ? lane : null}
        onSelectLane={(next) => {
          setSelected(next);
          voice.say(next.parentId ? 'Новые блоки пойдут внутрь' : 'Новые блоки пойдут сюда');
        }}
        disabled={running}
        sockets={limit !== undefined ? Math.max(0, limit - placed) : 0}
        onEdit={(id) => {
          if (running) return voice.say('Сначала нажми «Стоп»');
          const block = findBlock(program, id);
          const def = block && defaultCatalog.get(block.type);
          if (block && def) voice.say(speakBlock(def, block));
          setEditingId(id);
        }}
        onMove={(id, to, index) => setProgram((current) => moveBlock(current, id, to, index))}
        onAddScript={() => setAddingScript(true)}
      />
      <Palette
        className="rounded-3xl bg-white/50 side:order-2"
        blocks={palette}
        highlight={highlight}
        disabled={running}
        onPick={add}
      />
      {editing && editingDef && actions ? (
        <BlockEditDialog
          def={editingDef}
          block={editing}
          actions={actions}
          dynamicOptions={(param) =>
            param.kind === 'dynamic' && param.source === 'costumes'
              ? costumeOptions(
                  actors.find((actor) => actor.id === ownerOf(program, editing.id))?.character,
                )
              : []
          }
          onChange={(name, value) =>
            setProgram((current) => updateArg(current, editing.id, name, value))
          }
          onClose={() => setEditingId(null)}
        />
      ) : null}
      {addingScript ? (
        <AddScriptDialog
          hats={hats}
          onClose={() => setAddingScript(false)}
          onPick={(def) => {
            const created = addScript(program, target, defaultCatalog.create(def.type));
            setProgram(() => created.program);
            setSelected(created.lane);
            setAddingScript(false);
            sfx.add();
          }}
        />
      ) : null}
    </section>
  );
}

/** Costume choices of a character, plus "the next one". */
function costumeOptions(character: string | undefined): ChoiceOption[] {
  const costumes = (character && characterById(character)?.costumes) || [];
  return [
    { value: 'next', label: 'Следующий', icon: 'repeat', voice: 'следующий костюм' },
    ...costumes.map((costume) => ({
      value: costume.id,
      label: costume.label,
      icon: costume.id === 'party' ? 'party-popper' : 'shirt',
      voice: costume.label,
    })),
  ];
}

/** Actor whose script holds the block. */
function ownerOf(program: ProgramDoc, blockId: string): string | undefined {
  return blockPosition(program, blockId)?.lane.target;
}

function laneExists(program: ProgramDoc, lane: LaneRef): boolean {
  if (lane.parentId === null)
    return program.targets.some(
      (entry) =>
        entry.target === lane.target && entry.scripts.some((script) => script.id === lane.scriptId),
    );
  return !!findBlock(program, lane.parentId);
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

/** What the edit dialog can do with a block, derived from where it sits. */
function editActions(
  program: ProgramDoc,
  block: BlockNode,
  setProgram: ProgramPanelProps['setProgram'],
  close: () => void,
): EditActions {
  const def = defaultCatalog.get(block.type);
  if (def?.shape === 'hat') {
    const script = program.targets
      .flatMap((entry) => entry.scripts.map((item) => ({ target: entry.target, script: item })))
      .find((entry) => entry.script.blocks[0]?.id === block.id);
    const isMain =
      block.type === START_BLOCK &&
      !!script &&
      mainLane(program, script.target)?.scriptId === script.script.id;
    return {
      remove:
        isMain || !script
          ? null
          : () => {
              sfx.remove();
              setProgram((current) => removeScript(current, script.target, script.script.id));
              close();
            },
      removeLabel: 'Убрать программу',
    };
  }
  const position = blockPosition(program, block.id);
  if (!position) return { remove: null };
  const siblings = laneBlocks(program, position.lane);
  const previous = siblings[position.index - 1];
  const previousDef = previous ? defaultCatalog.get(previous.type) : undefined;
  const move = (index: number, lane: LaneRef = position.lane) =>
    setProgram((current) => moveBlock(current, block.id, lane, index));
  return {
    moveLeft: position.index > 0 ? () => move(position.index - 1) : null,
    moveRight: position.index < siblings.length - 1 ? () => move(position.index + 1) : null,
    putInside:
      previous && previousDef?.shape === 'wrapper'
        ? () => {
            const inner: LaneRef = {
              ...position.lane,
              parentId: previous.id,
              stack: previousDef.stacks?.[0] ?? 'DO',
            };
            move(laneBlocks(program, inner).length, inner);
            voice.say('Положили внутрь');
          }
        : null,
    takeOut: position.lane.parentId
      ? () => {
          const parent = blockPosition(program, position.lane.parentId ?? '');
          if (parent) move(parent.index + 1, parent.lane);
          voice.say('Вынули наружу');
        }
      : null,
    remove: () => {
      sfx.remove();
      setProgram((current) => removeBlock(current, block.id));
      close();
    },
  };
}
