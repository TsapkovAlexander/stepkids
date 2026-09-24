'use client';

import type { BlockDef } from '@stepkids/blocks';
import { KidDialog } from '@/components/kid/kid-dialog';
import { voice } from '@/lib/voice/voice';
import { BlockTile } from './block-tile';

/** Choosing the event that starts a new script: "когда старт", "когда тап", "когда касается". */
export function AddScriptDialog({
  hats,
  onPick,
  onClose,
}: {
  hats: BlockDef[];
  onPick: (def: BlockDef) => void;
  onClose: () => void;
}) {
  return (
    <KidDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Когда начать?"
      description="Выбери событие для новой программы"
    >
      <div className="flex flex-wrap justify-center gap-4">
        {hats.map((def) => (
          <div key={def.type} className="flex w-28 flex-col items-center gap-1 text-center">
            <BlockTile
              def={def}
              label={def.voice}
              onClick={() => {
                voice.say(def.voice);
                onPick(def);
              }}
            />
            <span className="text-sm leading-tight font-bold text-ink-soft">{def.voice}</span>
          </div>
        ))}
      </div>
    </KidDialog>
  );
}
