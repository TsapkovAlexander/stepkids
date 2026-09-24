'use client';

import { defaultCatalog, type BlockDef, type BlockNode, type ProgramDoc } from '@stepkids/blocks';
import { useState, type ReactNode } from 'react';
import { sfx } from '@/lib/audio/sfx';
import { ROOT, moveBlock, removeBlock, ribbonBlocks, updateArg } from '@/lib/ribbon/ops';
import { voice } from '@/lib/voice/voice';
import { BlockEditDialog } from './ribbon/block-edit-dialog';
import { Palette } from './ribbon/palette';
import { RibbonEditor } from './ribbon/ribbon-editor';

export interface ProgramPanelProps {
  program: ProgramDoc | null;
  setProgram: (update: (current: ProgramDoc) => ProgramDoc) => void;
  palette: BlockDef[];
  limit?: number;
  running: boolean;
  activeIds: ReadonlySet<string>;
  oopsId: string | null;
  ghost: { index: number; block: BlockNode } | null;
  highlight: string | null;
  onPick: (type: string) => void;
  controls: ReactNode;
}

/** Run controls, the ribbon and the palette; tap-to-edit dialog for placed blocks. */
export function ProgramPanel({ program, setProgram, palette, limit, running, activeIds, oopsId, ghost, highlight, onPick, controls }: ProgramPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const blocks = program ? ribbonBlocks(program) : [];
  const editingIndex = blocks.findIndex((block) => block.id === editingId);
  const editing = blocks[editingIndex];
  const editingDef = editing ? defaultCatalog.get(editing.type) : undefined;

  return (
    <section
      aria-label="Программа и блоки"
      className="flex min-h-0 flex-col gap-2 side:col-start-2 side:row-span-2 side:row-start-2 sm:gap-3"
    >
      <div className="side:order-3">{controls}</div>
      <RibbonEditor
        className="max-h-[30dvh] side:order-1 side:max-h-none side:flex-1"
        blocks={blocks}
        catalog={defaultCatalog}
        activeIds={activeIds}
        oopsId={oopsId}
        ghost={ghost}
        limit={limit}
        disabled={running}
        onEdit={(id) => {
          if (running) {
            voice.say('Сначала нажми «Стоп»');
            return;
          }
          setEditingId(id);
        }}
        onMove={(id, index) => setProgram((current) => moveBlock(current, id, ROOT, index))}
      />
      <Palette className="rounded-3xl bg-white/50 side:order-2" blocks={palette} highlight={highlight} disabled={running} onPick={(def) => onPick(def.type)} />
      {editing && editingDef ? (
        <BlockEditDialog
          def={editingDef}
          block={editing}
          canMoveLeft={editingIndex > 0}
          canMoveRight={editingIndex < blocks.length - 1}
          onChange={(name, value) => setProgram((current) => updateArg(current, editing.id, name, value))}
          onMove={(delta) => setProgram((current) => moveBlock(current, editing.id, ROOT, editingIndex + delta))}
          onDelete={() => {
            sfx.remove();
            setProgram((current) => removeBlock(current, editing.id));
            setEditingId(null);
          }}
          onClose={() => setEditingId(null)}
        />
      ) : null}
    </section>
  );
}
