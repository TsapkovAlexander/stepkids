import { describe, expect, it } from 'vitest';
import {
  defaultCatalog,
  normalizePhrase,
  numberToWords,
  pluralForm,
  speakBlock,
  speakNumber,
} from '../src';

const SECONDS = { one: 'секунду', few: 'секунды', many: 'секунд' };

describe('numberToWords', () => {
  it.each([
    [0, 'm', 'ноль'],
    [1, 'm', 'один'],
    [1, 'f', 'одну'],
    [1, 'n', 'одно'],
    [2, 'f', 'две'],
    [2, 'm', 'два'],
    [7, 'm', 'семь'],
    [11, 'm', 'одиннадцать'],
    [20, 'm', 'двадцать'],
    [21, 'f', 'двадцать одну'],
    [100, 'm', 'сто'],
    [342, 'f', 'триста сорок две'],
    [-3, 'm', 'минус три'],
  ] as const)('%i (%s) → %s', (value, gender, expected) => {
    expect(numberToWords(value, gender)).toBe(expected);
  });

  it('falls back to digits outside the supported range', () => {
    expect(numberToWords(1500)).toBe('1500');
    expect(numberToWords(2.5)).toBe('2.5');
  });
});

describe('pluralForm', () => {
  it.each([
    [1, 'секунду'],
    [2, 'секунды'],
    [4, 'секунды'],
    [5, 'секунд'],
    [11, 'секунд'],
    [14, 'секунд'],
    [21, 'секунду'],
    [22, 'секунды'],
    [0, 'секунд'],
  ])('%i → %s', (value, expected) => {
    expect(pluralForm(value, SECONDS)).toBe(expected);
  });
});

describe('speakBlock', () => {
  it('reads arrows with their count', () => {
    const def = defaultCatalog.require('motion_right');
    const block = defaultCatalog.create('motion_right', { count: 3 });
    expect(speakBlock(def)).toBe('вправо');
    expect(speakBlock(def, block)).toBe('вправо три');
  });

  it('agrees numerals with units', () => {
    const def = defaultCatalog.require('control_wait');
    expect(speakBlock(def, defaultCatalog.create('control_wait', { seconds: 1 }))).toBe(
      'подожди одну секунду',
    );
    expect(speakBlock(def, defaultCatalog.create('control_wait', { seconds: 2 }))).toBe(
      'подожди две секунды',
    );
    expect(speakNumber(5, 'm', { one: 'раз', few: 'раза', many: 'раз' })).toBe('пять раз');
  });

  it('reads choices and phrases', () => {
    const music = defaultCatalog.require('sound_music');
    expect(speakBlock(music, defaultCatalog.create('sound_music', { melody: 'bells' }))).toBe(
      'музыка: звоночки',
    );
    const say = defaultCatalog.require('looks_say');
    expect(speakBlock(say, defaultCatalog.create('looks_say', { text: 'Мяу!' }))).toBe(
      'скажи: Мяу!',
    );
  });

  it('resolves dynamic options through the callback', () => {
    const def = defaultCatalog.require('looks_costume');
    const block = defaultCatalog.create('looks_costume', { costume: 'party' });
    expect(speakBlock(def, block, () => 'праздничный')).toBe('костюм: праздничный');
    expect(speakBlock(def, block)).toBe('костюм: party');
  });
});

describe('normalizePhrase', () => {
  it('ignores case, punctuation and ё', () => {
    expect(normalizePhrase('  Ёжик,  ПРИВЕТ! ')).toBe('ежик привет');
  });
});
