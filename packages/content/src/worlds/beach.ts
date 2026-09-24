import type { WorldSeed } from '@stepkids/blocks';
import { TIER1_ARROWS, corridor, level, map, times } from '../authoring/dsl';

const say = (text: string) => ({ kind: 'say' as const, text });
const highlight = (blockType: string, text?: string) => ({
  kind: 'highlight' as const,
  blockType,
  ...(text ? { text } : {}),
});
const showStep = (text = 'Смотри, я покажу первый шаг.') => ({ kind: 'showStep' as const, text });
const beach = (rows: string[]) => map(rows, { theme: 'beach' });
const taps = (...at: number[]) => at.map((atMs) => ({ atMs, tap: 'hero' }));
const NEW_SCRIPT_TIP = say('Нажми «Ещё программа» и выбери, когда она начнётся.');

/** World 4 — «Солнечный пляж»: events (tap, touch), "forever", parallel scripts, looks. */
export const beachWorld: WorldSeed = {
  id: 'beach',
  tier: 2,
  order: 2,
  title: 'Солнечный пляж',
  voice: 'Солнечный пляж. Здесь герои слушаются нажатий и делают несколько дел сразу.',
  island: 'beach',
  unlock: { minStars: 15 },
  reward: { themes: ['beach'] },
  levels: [
    {
      id: 'beach-01',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Добавь программу «Когда тап», нажми «Запуск», а потом — на героя!',
        scene: beach(['......', 'H...F.', '......']),
        allowed: [...TIER1_ARROWS, 'event_tap'],
        goals: [{ kind: 'reach', x: 4, y: 1 }],
        stars: {},
        hints: [
          NEW_SCRIPT_TIP,
          highlight(
            'motion_right',
            'В программу «Когда тап» положи стрелку вправо и выбери четыре.',
          ),
          showStep(),
        ],
        reference: { hero: ['start: ', 'tap: R4'] },
        inputs: taps(400),
      }),
    },
    {
      id: 'beach-02',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Каждое нажатие на героя — один шаг. Дойди до флажка!',
        scene: beach(['.......', 'H.....F', '.......']),
        allowed: [...TIER1_ARROWS, 'event_tap'],
        goals: [{ kind: 'reach', x: 6, y: 1 }],
        stars: { three: { maxBlocks: 2 } },
        hints: [
          NEW_SCRIPT_TIP,
          highlight('motion_right', 'В «Когда тап» — один шаг вправо. А потом нажимай на героя!'),
          showStep(),
        ],
        reference: { hero: ['start: ', 'tap: R1'] },
        inputs: taps(400, 1100, 1800, 2500, 3200, 3900),
      }),
    },
    {
      id: 'beach-03',
      content: level({
        tier: 2,
        kind: 'collect',
        text: 'Бегай вокруг озера всегда! Собери все звёзды.',
        scene: beach(['H.*..', '.WWW*', '*WWW.', '..*..']),
        allowed: [...TIER1_ARROWS, 'control_forever'],
        goals: [{ kind: 'collectAll' }],
        stars: { two: { maxBlocks: 7 }, three: { maxBlocks: 5 } },
        hints: [
          say('Блок «Всегда» повторяет без конца. Положи в него круг вокруг озера.'),
          highlight('control_forever'),
          showStep(),
        ],
        reference: '[*: R4 D3 L4 U3]',
      }),
    },
    {
      id: 'beach-04',
      content: level({
        tier: 2,
        kind: 'collect',
        text: 'Когда герой коснётся звезды, пусть скажет «Ура!» Дойди до флажка.',
        scene: beach(['......', 'H..*.F', '......']),
        allowed: [...TIER1_ARROWS, 'looks_say', 'event_touch'],
        goals: [
          { kind: 'collectAll' },
          { kind: 'reach', x: 5, y: 1 },
          { kind: 'say', text: 'Ура!' },
        ],
        stars: { two: { maxBlocks: 4 }, three: { maxBlocks: 3 } },
        hints: [
          NEW_SCRIPT_TIP,
          highlight('looks_say', 'В программу «Касается звезды» положи «Скажи: Ура!»'),
          showStep(),
        ],
        reference: { hero: ['start: R5', 'touch:star: S:Ура!'] },
      }),
    },
    {
      id: 'beach-05',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Надень праздничный колпак и иди на праздник к флажку!',
        scene: beach(['.....', 'H...F', '.....']),
        allowed: [...TIER1_ARROWS, 'looks_costume'],
        goals: [
          { kind: 'costume', costume: 'party' },
          { kind: 'reach', x: 4, y: 1 },
        ],
        stars: { two: { maxBlocks: 3 }, three: { maxBlocks: 2 } },
        hints: [
          say('Блок «Костюм» переодевает героя.'),
          highlight('looks_costume', 'Нажми на «Костюм» и выбери «Праздник».'),
          showStep(),
        ],
        reference: 'C:party R4',
      }),
    },
    {
      id: 'beach-06',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Дойди до пальмы и спрячься за ней!',
        scene: beach(['.....', 'H..T.', '.....']),
        allowed: [...TIER1_ARROWS, 'looks_hide', 'looks_show'],
        goals: [
          { kind: 'reach', x: 2, y: 1 },
          { kind: 'hidden', hidden: true },
        ],
        stars: { two: { maxBlocks: 3 }, three: { maxBlocks: 2 } },
        hints: [
          say('Подойди к пальме вплотную, а потом добавь «Спрятаться».'),
          highlight('looks_hide'),
          showStep(),
        ],
        reference: 'R2 hide',
      }),
    },
    {
      id: 'beach-07',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Иди к флажку и одновременно пой «Ля-ля-ля!». Нужны две программы!',
        scene: beach(['......', 'H....F', '......']),
        allowed: [...TIER1_ARROWS, 'looks_say', 'event_start'],
        goals: [
          { kind: 'reach', x: 5, y: 1 },
          { kind: 'say', text: 'Ля-ля-ля!' },
          { kind: 'withinTime', seconds: 2.5 },
        ],
        stars: { two: { maxBlocks: 3 }, three: { maxBlocks: 2 } },
        hints: [
          say('Если петь, а потом идти, не успеешь. Пусть две программы работают вместе!'),
          highlight('looks_say', 'Добавь ещё одну программу «Когда старт» и положи туда «Скажи».'),
          showStep(),
        ],
        reference: { hero: ['start: R5', 'start: S:Ля-ля-ля!'] },
      }),
    },
    {
      id: 'beach-08',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Когда дойдёшь до флажка, переоденься в праздничный костюм!',
        scene: beach(['.....', 'H...F', '.....']),
        allowed: [...TIER1_ARROWS, 'looks_costume', 'event_touch'],
        goals: [
          { kind: 'reach', x: 4, y: 1 },
          { kind: 'costume', costume: 'party' },
        ],
        stars: { two: { maxBlocks: 4 }, three: { maxBlocks: 3 } },
        hints: [
          NEW_SCRIPT_TIP,
          highlight('looks_costume', 'Программа «Касается флажка», а в ней — «Костюм: праздник».'),
          showStep(),
        ],
        reference: { hero: ['start: R4', 'touch:flag: C:party'] },
      }),
    },
    {
      id: 'beach-09',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Каждый тап — две ступеньки. Нажимай на героя, пока он не поднимется!',
        scene: map(
          corridor({ cols: 5, rows: 5, start: [0, 4], moves: times('R1 U1', 4), wall: 'W' }),
          { theme: 'beach' },
        ),
        allowed: [...TIER1_ARROWS, 'control_repeat', 'event_tap'],
        goals: [{ kind: 'reach', x: 4, y: 0 }],
        stars: { two: { maxBlocks: 6 }, three: { maxBlocks: 4 } },
        hints: [
          NEW_SCRIPT_TIP,
          highlight('control_repeat', 'В «Когда тап» положи «Повтори два раза»: вправо и вверх.'),
          showStep(),
        ],
        reference: { hero: ['start: ', 'tap: [2: R1 U1]'] },
        inputs: taps(400, 2400),
      }),
    },
    {
      id: 'beach-10',
      content: level({
        tier: 2,
        kind: 'collect',
        text: 'Бегай вокруг лужи всегда, а у каждой звезды кричи «Звезда!»',
        scene: beach(['H*..', '.WW*', '..*.']),
        allowed: [...TIER1_ARROWS, 'control_forever', 'looks_say', 'event_touch'],
        goals: [{ kind: 'collectAll' }, { kind: 'say', text: 'Звезда!' }],
        stars: { two: { maxBlocks: 9 }, three: { maxBlocks: 7 } },
        hints: [
          say('Одна программа бегает по кругу, другая кричит, когда герой касается звезды.'),
          highlight('control_forever'),
          showStep(),
        ],
        reference: { hero: ['start: [*: R3 D2 L3 U2]', 'touch:star: S:Звезда!'] },
      }),
    },
  ],
};
