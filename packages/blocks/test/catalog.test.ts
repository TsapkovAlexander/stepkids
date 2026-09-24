import { describe, expect, it } from 'vitest';
import { BlockCatalog, CORE_BLOCKS, LABEL_MAX_LENGTH, defaultCatalog } from '../src';

describe('BlockCatalog', () => {
  it('keeps every label within the limit and every block voiced', () => {
    for (const def of defaultCatalog.all()) {
      expect(def.label.length).toBeLessThanOrEqual(LABEL_MAX_LENGTH);
      expect(def.voice.length).toBeGreaterThan(0);
      expect(def.codegen.js.length).toBeGreaterThan(0);
      expect(def.codegen.py.length).toBeGreaterThan(0);
    }
  });

  it('rejects duplicate types and long labels', () => {
    const base = CORE_BLOCKS[1];
    if (!base) throw new Error('catalog is empty');
    expect(() => new BlockCatalog([base, base])).toThrow(/Duplicate/);
    expect(() => new BlockCatalog([{ ...base, label: 'Очень длинная подпись' }])).toThrow(/longer/);
  });

  it('creates blocks with defaults and stacks', () => {
    const arrow = defaultCatalog.create('motion_up');
    expect(arrow.args).toEqual({ count: 1 });
    expect(arrow.id).toMatch(/^[a-z0-9]{10}$/);
    const repeat = defaultCatalog.create('control_repeat', { times: 4 });
    expect(repeat.args).toEqual({ times: 4 });
    expect(repeat.stacks).toEqual({ DO: [] });
    expect(defaultCatalog.create('event_start').args).toBeUndefined();
  });

  it('throws on unknown types', () => {
    expect(() => defaultCatalog.require('nope')).toThrow(/Unknown/);
    expect(defaultCatalog.has('nope')).toBe(false);
  });

  it('builds palettes', () => {
    const palette = defaultCatalog.palette(['motion_left', 'motion_right', 'event_start']);
    expect(palette.map((def) => def.type)).toEqual(['event_start', 'motion_right', 'motion_left']);
    expect(defaultCatalog.upToTier(1).every((def) => def.tier === 1)).toBe(true);
    expect(defaultCatalog.upToTier(2).length).toBeGreaterThan(defaultCatalog.upToTier(1).length);
    expect(defaultCatalog.isHat('event_tap')).toBe(true);
    expect(defaultCatalog.isHat('motion_up')).toBe(false);
  });

  it('normalises arguments into their ranges', () => {
    expect(defaultCatalog.normalizeArg('motion_right', 'count', 42)).toBe(9);
    expect(defaultCatalog.normalizeArg('motion_right', 'count', 0)).toBe(1);
    expect(defaultCatalog.normalizeArg('motion_right', 'count', '3')).toBe(3);
    expect(defaultCatalog.normalizeArg('motion_right', 'count', 'abc')).toBe(1);
    expect(defaultCatalog.normalizeArg('looks_say', 'text', 'x'.repeat(100))).toHaveLength(40);
    expect(defaultCatalog.normalizeArg('looks_say', 'text', undefined)).toBe('Привет!');
    expect(defaultCatalog.normalizeArg('sound_music', 'melody', 'rock')).toBe('happy');
    expect(defaultCatalog.normalizeArg('sound_music', 'melody', 'drum')).toBe('drum');
    expect(defaultCatalog.normalizeArg('looks_costume', 'costume', '')).toBe('next');
    expect(defaultCatalog.normalizeArg('motion_right', 'unknown', 5)).toBe(5);
    const reporter = { id: 'r', type: 'op_add' };
    expect(defaultCatalog.normalizeArg('motion_right', 'count', reporter)).toBe(1);
  });
});
