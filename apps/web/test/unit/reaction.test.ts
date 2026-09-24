import { describe, expect, it } from 'vitest';
import type { RunResult } from '@stepkids/engine';
import { failureCode, reactionLine } from '@/lib/progress/reaction';

const base: RunResult = { success: false, stars: 0, blocks: 1, steps: 1, bumps: 0, timeMs: 100, goals: [], failure: null };

describe('reactionLine', () => {
  it('praises in the hero voice', () => {
    expect(reactionLine({ ...base, success: true, stars: 3 }, 'kitten', 0)).toBe('Мур! Получилось!');
    expect(reactionLine({ ...base, success: true }, 'hedgehog', 1)).toBe('Молодец! Всё правильно!');
  });

  it('explains failures kindly', () => {
    expect(reactionLine({ ...base, failure: { kind: 'bump', reason: 'rock', actorId: 'hero', blockId: null } }, 'kitten', 0)).toBe('Ой, камень!');
    const goal = { goal: { kind: 'collectAll' as const }, met: false, detail: 'starsLeft' as const, starsLeft: 2 };
    expect(reactionLine({ ...base, failure: { kind: 'goal', statuses: [goal] } }, 'kitten', 1)).toBe('Звёздочки ещё остались!');
    expect(reactionLine({ ...base, failure: { kind: 'goal', statuses: [] } }, 'kitten', 0)).toMatch(/попробуем/i);
    expect(reactionLine({ ...base, failure: { kind: 'empty' } }, 'kitten', 0)).toMatch(/блоки/);
    expect(reactionLine({ ...base, failure: { kind: 'timeout' } }, 'kitten', 0)).toMatch(/устал/);
    expect(reactionLine({ ...base, failure: { kind: 'manual' } }, 'kitten', 0)).toMatch(/родителю/);
    expect(reactionLine({ ...base, failure: { kind: 'error', code: 'x', message: 'Сообщение', blockId: null } }, 'kitten', 0)).toBe('Сообщение');
    expect(reactionLine(base, 'kitten', 0)).toMatch(/ещё раз/);
  });

  it('encodes failures for analytics', () => {
    expect(failureCode(base)).toBeNull();
    expect(failureCode({ ...base, failure: { kind: 'bump', reason: 'edge', actorId: 'hero', blockId: null } })).toBe('bump:edge');
    expect(failureCode({ ...base, failure: { kind: 'goal', statuses: [] } })).toBe('goal:unknown');
    expect(failureCode({ ...base, failure: { kind: 'error', code: 'too_many_steps', message: '', blockId: null } })).toBe(
      'error:too_many_steps',
    );
    expect(failureCode({ ...base, failure: { kind: 'empty' } })).toBe('empty');
  });
});
