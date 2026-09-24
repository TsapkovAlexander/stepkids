import { isBlockNode, type BlockNode } from './ast';
import type { BlockDef, NounForms, NumeralGender, ParamDef } from './catalog/types';

const UNITS_M = [
  'ноль',
  'один',
  'два',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
];
const TEENS = [
  'десять',
  'одиннадцать',
  'двенадцать',
  'тринадцать',
  'четырнадцать',
  'пятнадцать',
  'шестнадцать',
  'семнадцать',
  'восемнадцать',
  'девятнадцать',
];
const TENS = [
  '',
  '',
  'двадцать',
  'тридцать',
  'сорок',
  'пятьдесят',
  'шестьдесят',
  'семьдесят',
  'восемьдесят',
  'девяносто',
];
const HUNDREDS = [
  '',
  'сто',
  'двести',
  'триста',
  'четыреста',
  'пятьсот',
  'шестьсот',
  'семьсот',
  'восемьсот',
  'девятьсот',
];

function unitWord(digit: number, gender: NumeralGender): string {
  // Accusative forms, because block voices are commands: "подожди одну секунду".
  if (digit === 1) return gender === 'f' ? 'одну' : gender === 'n' ? 'одно' : 'один';
  if (digit === 2) return gender === 'f' ? 'две' : 'два';
  return UNITS_M[digit] ?? '';
}

/** Russian cardinal numeral for integers in −999…999. Larger values fall back to digits. */
export function numberToWords(value: number, gender: NumeralGender = 'm'): string {
  if (!Number.isInteger(value) || Math.abs(value) > 999) return String(value);
  if (value < 0) return `минус ${numberToWords(-value, gender)}`;
  if (value === 0) return 'ноль';
  const words: string[] = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  if (hundreds > 0) words.push(HUNDREDS[hundreds] ?? '');
  if (rest >= 10 && rest < 20) {
    words.push(TEENS[rest - 10] ?? '');
  } else {
    const tens = Math.floor(rest / 10);
    const units = rest % 10;
    if (tens > 0) words.push(TENS[tens] ?? '');
    if (units > 0) words.push(unitWord(units, gender));
  }
  return words.join(' ');
}

/** Picks the noun form for a number: 1 шаг, 2 шага, 5 шагов, 21 шаг, 11 шагов. */
export function pluralForm(value: number, forms: NounForms): string {
  const n = Math.abs(Math.trunc(value));
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return forms.many;
  if (last === 1) return forms.one;
  if (last >= 2 && last <= 4) return forms.few;
  return forms.many;
}

export function speakNumber(value: number, gender: NumeralGender, unit?: NounForms): string {
  const words = numberToWords(value, gender);
  return unit ? `${words} ${pluralForm(value, unit)}` : words;
}

export type DynamicLabelResolver = (param: ParamDef, value: string) => string | undefined;

function speakArg(param: ParamDef, value: unknown, resolve?: DynamicLabelResolver): string {
  if (isBlockNode(value)) return 'значение';
  switch (param.kind) {
    case 'int':
      return speakNumber(Number(value), param.gender, param.unit);
    case 'number':
      return Number.isInteger(Number(value))
        ? numberToWords(Number(value))
        : String(value).replace('.', ',');
    case 'text':
      return String(value ?? '');
    case 'choice':
      return param.options.find((option) => option.value === value)?.voice ?? String(value ?? '');
    case 'dynamic':
      return resolve?.(param, String(value)) ?? String(value ?? '');
    case 'slot':
      return String(value ?? '');
  }
}

/** Spoken description of a placed block: "вправо три", "подожди две секунды". */
export function speakBlock(
  def: BlockDef,
  block?: BlockNode,
  resolve?: DynamicLabelResolver,
): string {
  if (!block || !def.voiceTemplate) return def.voice;
  return def.voiceTemplate.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const param = def.params.find((p) => p.name === name);
    if (!param) return '';
    return speakArg(param, block.args?.[name] ?? param.default, resolve);
  });
}

/** Normalises a phrase for comparisons ("Привет!" equals "привет"). */
export function normalizePhrase(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
