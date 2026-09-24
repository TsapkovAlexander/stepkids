import { describe, expect, it } from 'vitest';
import {
  defaultCatalog,
  normalizeForBlockly,
  targetToWorkspace,
  TASK_TEXT_LIMIT_YOUNG,
  withScripts,
  workspaceToScripts,
  type ProgramDoc,
} from '@stepkids/blocks';
import { checkLevel, runHeadless } from '@stepkids/engine';
import { AUTHORED_WORLDS } from '../src/worlds';
import { CHARACTERS, SEED_WORLDS, characterById, costumesOf, seedWorld } from '../src';

const allLevels = SEED_WORLDS.flatMap((world) =>
  world.levels.map((entry) => ({ world, ...entry })),
);

describe('seed worlds', () => {
  it('match the authoring sources byte for byte (run pnpm build:seeds)', () => {
    expect(JSON.parse(JSON.stringify(AUTHORED_WORLDS))).toEqual(
      JSON.parse(JSON.stringify(SEED_WORLDS)),
    );
  });

  it('give tier 1 two worlds and tier 2 three worlds of ten levels', () => {
    expect(SEED_WORLDS.map((world) => [world.id, world.tier, world.levels.length])).toEqual([
      ['meadow', 1, 10],
      ['forest', 1, 10],
      ['snow', 2, 10],
      ['beach', 2, 10],
      ['candy', 2, 10],
    ]);
    expect(seedWorld('forest')?.title).toBe('Волшебный лес');
    expect(seedWorld('nope')).toBeUndefined();
  });

  it('use unique level ids', () => {
    const ids = allLevels.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reference existing characters and worlds', () => {
    const worldIds = new Set(SEED_WORLDS.map((world) => world.id));
    for (const world of SEED_WORLDS) {
      for (const id of world.reward?.characters ?? []) expect(characterById(id)?.role).toBe('hero');
      if (world.unlock.afterWorld) expect(worldIds.has(world.unlock.afterWorld)).toBe(true);
    }
    for (const character of CHARACTERS) {
      if (character.unlockedBy) expect(worldIds.has(character.unlockedBy)).toBe(true);
    }
    expect(costumesOf('kitten')).toEqual(['default', 'party', 'cap']);
    expect(costumesOf('unknown')).toEqual(['default']);
  });
});

describe.each(allLevels)('level $id', ({ content }) => {
  it('passes the headless check with three stars', () => {
    const check = checkLevel(content, { costumes: costumesOf });
    expect(check.problems).toEqual([]);
    expect(check.result?.stars).toBe(3);
  });

  it('opens in the puzzle editor without loss and still earns three stars', () => {
    const reference = content.reference;
    if (!reference) return;
    let program: ProgramDoc = reference;
    for (const target of reference.targets) {
      const saved = JSON.parse(
        JSON.stringify(targetToWorkspace(reference, target.target, defaultCatalog)),
      );
      program = withScripts(program, target.target, workspaceToScripts(saved, defaultCatalog));
    }
    const strip = (doc: ProgramDoc) =>
      doc.targets.map((target) => target.scripts.map(({ x: _x, y: _y, ...script }) => script));
    expect(strip(program)).toEqual(strip(normalizeForBlockly(reference, defaultCatalog)));
    expect(
      checkLevel({ ...content, reference: program }, { costumes: costumesOf }).result?.stars,
    ).toBe(3);
  });

  it('is voiced and short enough for a six-year-old', () => {
    expect(content.taskText.length).toBeLessThanOrEqual(TASK_TEXT_LIMIT_YOUNG);
    expect(content.hints.length).toBe(3);
  });

  it('uses known blocks and highlights only allowed ones', () => {
    for (const type of content.allowedBlocks) expect(defaultCatalog.has(type)).toBe(true);
    for (const hint of content.hints) {
      if (hint.kind === 'highlight') expect(content.allowedBlocks).toContain(hint.blockType);
    }
  });

  it('places known characters', () => {
    if (content.scene.kind !== 'grid') throw new Error('tier 1 uses grid scenes');
    for (const actor of content.scene.actors) expect(characterById(actor.character)).toBeDefined();
    expect(content.scene.actors.some((actor) => actor.id === 'hero')).toBe(true);
  });

  it('starts from a program that still needs work', () => {
    if (!content.starterProgram) return;
    const result = runHeadless(content, content.starterProgram, { costumes: costumesOf });
    expect(result.success && result.stars === 3).toBe(false);
  });
});
