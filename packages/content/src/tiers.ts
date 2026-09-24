import type { Tier } from '@stepkids/blocks';

export interface TierDef {
  id: Tier;
  title: string;
  voice: string;
  ages: string;
  sceneMode: 'grid' | 'free';
  editorMode: 'ribbon' | 'blocks';
  /** Share of the previous tier's levels to solve before this tier opens. */
  unlockShare: number;
}

export const TIERS_META: TierDef[] = [
  {
    id: 1,
    title: 'Малыш',
    voice: 'Ступень Малыш',
    ages: '5–7',
    sceneMode: 'grid',
    editorMode: 'ribbon',
    unlockShare: 0,
  },
  {
    id: 2,
    title: 'Исследователь',
    voice: 'Ступень Исследователь',
    ages: '6–8',
    sceneMode: 'grid',
    editorMode: 'ribbon',
    unlockShare: 0.8,
  },
  {
    id: 3,
    title: 'Изобретатель',
    voice: 'Ступень Изобретатель',
    ages: '8–10',
    sceneMode: 'free',
    editorMode: 'blocks',
    unlockShare: 0.8,
  },
  {
    id: 4,
    title: 'Программист',
    voice: 'Ступень Программист',
    ages: '10+',
    sceneMode: 'free',
    editorMode: 'blocks',
    unlockShare: 0.8,
  },
];
