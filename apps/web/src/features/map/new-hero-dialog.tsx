'use client';

import type { CharacterDef } from '@stepkids/content';
import { PartyPopper } from 'lucide-react';
import { useEffect } from 'react';
import { CharacterArt } from '@/components/kid/art-image';
import { KidButton } from '@/components/kid/kid-button';
import { KidDialog } from '@/components/kid/kid-dialog';
import { sfx } from '@/lib/audio/sfx';
import { voice } from '@/lib/voice/voice';

/** Celebrates a hero earned by finishing a world. */
export function NewHeroDialog({ hero, onClose, onPlay }: { hero: CharacterDef; onClose: () => void; onPlay: () => void }) {
  useEffect(() => {
    sfx.win();
    voice.say(`Новый друг! Это ${hero.name}. Хочешь играть со мной?`, { character: hero.id });
  }, [hero]);
  return (
    <KidDialog open onOpenChange={(open) => !open && onClose()} title="Новый друг!" description={hero.name}>
      <div className="flex flex-col items-center gap-3 text-center">
        <CharacterArt character={hero.id} costume="party" className="h-48 w-48 animate-pop" />
        <p className="text-2xl font-black">{hero.name}</p>
        <KidButton voiceLabel="Играть с новым другом" caption="Играть!" icon={PartyPopper} tone="go" size="lg" silent onClick={onPlay} />
      </div>
    </KidDialog>
  );
}
