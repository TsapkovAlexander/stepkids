import type { BumpReasonKey, ReactionKey } from './reactions';

export interface CostumeDef {
  id: string;
  label: string;
}

/** Voice profile for speech synthesis: every hero sounds different. */
export interface VoiceProfile {
  pitch: number;
  rate: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  /** Heroes can be chosen by the child; NPCs only appear in scenes. */
  role: 'hero' | 'npc';
  costumes: CostumeDef[];
  voice: VoiceProfile;
  /** World whose completion unlocks the hero; `null` means available from the start. */
  unlockedBy: string | null;
  /** Hero-specific reactions; fall back to the shared ones. */
  lines?: Partial<Record<ReactionKey | BumpReasonKey, string[]>>;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'kitten',
    name: 'Котёнок Кузя',
    role: 'hero',
    costumes: [
      { id: 'default', label: 'Обычный' },
      { id: 'party', label: 'Праздник' },
      { id: 'cap', label: 'Кепка' },
    ],
    voice: { pitch: 1.35, rate: 0.95 },
    unlockedBy: null,
    lines: { win: ['Мур! Получилось!', 'Ура! Мы справились!', 'Ты настоящий программист!'] },
  },
  {
    id: 'bunny',
    name: 'Зайка Хоп',
    role: 'hero',
    costumes: [
      { id: 'default', label: 'Обычный' },
      { id: 'party', label: 'Праздник' },
      { id: 'cap', label: 'Кепка' },
    ],
    voice: { pitch: 1.6, rate: 1.05 },
    unlockedBy: 'meadow',
    lines: { win: ['Прыг-скок! Получилось!', 'Ура! Ты молодец!'] },
  },
  {
    id: 'robot',
    name: 'Робот Бип',
    role: 'hero',
    costumes: [
      { id: 'default', label: 'Обычный' },
      { id: 'party', label: 'Праздник' },
      { id: 'cap', label: 'Кепка' },
    ],
    voice: { pitch: 0.75, rate: 0.95 },
    unlockedBy: 'forest',
    lines: { win: ['Бип-бип! Задание выполнено!', 'Программа работает! Ура!'] },
  },
  {
    id: 'hedgehog',
    name: 'Ёжик',
    role: 'npc',
    costumes: [{ id: 'default', label: 'Обычный' }],
    voice: { pitch: 1.1, rate: 0.9 },
    unlockedBy: null,
  },
];

export function characterById(id: string): CharacterDef | undefined {
  return CHARACTERS.find((character) => character.id === id);
}

export function costumesOf(id: string): string[] {
  return characterById(id)?.costumes.map((costume) => costume.id) ?? ['default'];
}

export const DEFAULT_HERO = 'kitten';
