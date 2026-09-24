import { gridSceneSchema, type GridSceneInput, type LevelContent } from '@stepkids/blocks';

/** A goal-less "level" for the Workshop and full-screen shows. */
export function sandboxLevel(scene: GridSceneInput, allowedBlocks: string[], title = 'Мастерская'): LevelContent {
  return {
    schemaVersion: 1,
    kind: 'free',
    tier: 1,
    taskText: title,
    scene: gridSceneSchema.parse(scene),
    allowedBlocks,
    goals: [{ kind: 'manual' }],
    stars: {},
    hints: [],
  };
}
