import type { WorldSeed } from '@stepkids/blocks';
import { TIER1_ARROWS, corridor, level, map, mergeMaps, times } from '../authoring/dsl';

const say = (text: string) => ({ kind: 'say' as const, text });
const highlight = (blockType: string, text?: string) => ({
  kind: 'highlight' as const,
  blockType,
  ...(text ? { text } : {}),
});
const showStep = (text = 'Смотри, я покажу первый шаг.') => ({ kind: 'showStep' as const, text });
const candy = (rows: string[]) => map(rows, { theme: 'candy' });
const FRIEND_TIP = say('Нажми на друга над программой — у каждого героя своя программа.');
const reach = (actor: string, x: number, y: number) => ({ kind: 'reach' as const, x, y, actor });

/** World 5 — «Конфетная страна»: two heroes, parallel scripts, friends reacting to each other. */
export const candyWorld: WorldSeed = {
  id: 'candy',
  tier: 2,
  order: 3,
  title: 'Конфетная страна',
  voice: 'Конфетная страна. Здесь играют два друга, и у каждого своя программа.',
  island: 'candy',
  unlock: { minStars: 35 },
  reward: { themes: ['candy'] },
  levels: [
    {
      id: 'candy-01',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Помоги обоим друзьям дойти до своих флажков!',
        scene: candy(['H....F', '......', '......', 'A....F']),
        allowed: TIER1_ARROWS,
        goals: [reach('hero', 5, 0), reach('friend', 5, 3)],
        stars: { three: { maxBlocks: 2 } },
        hints: [
          FRIEND_TIP,
          highlight('motion_right', 'Каждому — стрелка вправо на пять.'),
          showStep(),
        ],
        reference: { hero: ['start: R5'], friend: ['start: R5'] },
      }),
    },
    {
      id: 'candy-02',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Пусть друзья встретятся, а когда коснутся — друг скажет «Привет!»',
        scene: candy(['......', 'H....A', '......']),
        allowed: [...TIER1_ARROWS, 'looks_say', 'event_touch'],
        goals: [{ kind: 'say', text: 'Привет!', actor: 'friend' }],
        stars: { two: { maxBlocks: 5 }, three: { maxBlocks: 4 } },
        hints: [
          FRIEND_TIP,
          highlight('looks_say', 'У друга программа «Касается друга», а в ней «Скажи: Привет!»'),
          showStep(),
        ],
        reference: { hero: ['start: R2'], friend: ['start: L3', 'touch:actor: S:Привет!'] },
      }),
    },
    {
      id: 'candy-03',
      content: level({
        tier: 2,
        kind: 'collect',
        text: 'Соберите все звёзды вдвоём: каждый — на своей дорожке.',
        scene: candy(['H.*.*.*', 'TTTTTTT', 'TTTTTTT', 'A.*.*.*']),
        allowed: TIER1_ARROWS,
        goals: [{ kind: 'collectAll' }],
        stars: { two: { maxBlocks: 4 }, three: { maxBlocks: 2 } },
        hints: [FRIEND_TIP, highlight('motion_right'), showStep()],
        reference: { hero: ['start: R6'], friend: ['start: R6'] },
      }),
    },
    {
      id: 'candy-04',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Один друг поднимается, другой спускается. Обоим пригодится «Повтори»!',
        scene: candy(
          mergeMaps(
            'T',
            corridor({ cols: 10, rows: 5, start: [0, 4], moves: times('R1 U1', 4) }),
            corridor({ cols: 10, rows: 5, start: [5, 0], moves: times('R1 D1', 4), actor: 'A' }),
          ),
        ),
        allowed: [...TIER1_ARROWS, 'control_repeat'],
        goals: [reach('hero', 4, 0), reach('friend', 9, 4)],
        stars: { two: { maxBlocks: 8 }, three: { maxBlocks: 6 } },
        hints: [
          FRIEND_TIP,
          highlight('control_repeat', 'У каждого своё «Повтори» четыре раза.'),
          showStep(),
        ],
        reference: { hero: ['start: [4: R1 U1]'], friend: ['start: [4: R1 D1]'] },
      }),
    },
    {
      id: 'candy-05',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Герой идёт сам, а друг — когда на него нажмёшь.',
        scene: candy(['H...F.', '......', 'A...F.']),
        allowed: [...TIER1_ARROWS, 'event_tap'],
        goals: [reach('hero', 4, 0), reach('friend', 4, 2)],
        stars: { two: { maxBlocks: 4 }, three: { maxBlocks: 3 } },
        hints: [
          FRIEND_TIP,
          highlight('motion_right', 'Другу добавь программу «Когда тап».'),
          showStep(),
        ],
        reference: { hero: ['start: R4'], friend: ['start: ', 'tap: R4'] },
        inputs: [{ atMs: 400, tap: 'friend' }],
      }),
    },
    {
      id: 'candy-06',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Играем в прятки: когда герой найдёт друга, друг прячется!',
        scene: candy(['.....', 'H..A.', '.....']),
        allowed: [...TIER1_ARROWS, 'looks_hide', 'looks_show', 'event_touch'],
        goals: [reach('hero', 3, 1), { kind: 'hidden', hidden: true, actor: 'friend' }],
        stars: { two: { maxBlocks: 4 }, three: { maxBlocks: 3 } },
        hints: [
          FRIEND_TIP,
          highlight('looks_hide', 'У друга: «Касается друга» и «Спрятаться».'),
          showStep(),
        ],
        reference: { hero: ['start: R3'], friend: ['start: ', 'touch:actor: hide'] },
      }),
    },
    {
      id: 'candy-07',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Праздник! Оба друга надевают колпаки и идут к флажкам.',
        scene: candy(['H...F', '.....', 'A...F']),
        allowed: [...TIER1_ARROWS, 'looks_costume'],
        goals: [
          { kind: 'costume', costume: 'party', actor: 'hero' },
          { kind: 'costume', costume: 'party', actor: 'friend' },
          reach('hero', 4, 0),
          reach('friend', 4, 2),
        ],
        stars: { two: { maxBlocks: 5 }, three: { maxBlocks: 4 } },
        hints: [FRIEND_TIP, highlight('looks_costume'), showStep()],
        reference: { hero: ['start: C:party R4'], friend: ['start: C:party R4'] },
      }),
    },
    {
      id: 'candy-08',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Эстафета! Добеги до друга — и он побежит к флажку.',
        scene: candy(['......', 'H.A..F', '......']),
        allowed: [...TIER1_ARROWS, 'event_touch'],
        goals: [reach('friend', 5, 1)],
        stars: { two: { maxBlocks: 4 }, three: { maxBlocks: 3 } },
        hints: [
          FRIEND_TIP,
          highlight('motion_right', 'У друга программа «Касается друга» со стрелкой вправо.'),
          showStep(),
        ],
        reference: { hero: ['start: R2'], friend: ['start: ', 'touch:actor: R3'] },
      }),
    },
    {
      id: 'candy-09',
      content: level({
        tier: 2,
        kind: 'collect',
        text: 'Два друга бегают по кругу всегда. Соберите все звёзды!',
        scene: candy(['H.*.A.*.', '.WW..WW.', '*...*...']),
        allowed: [...TIER1_ARROWS, 'control_forever'],
        goals: [{ kind: 'collectAll' }],
        stars: { two: { maxBlocks: 12 }, three: { maxBlocks: 10 } },
        hints: [
          FRIEND_TIP,
          highlight('control_forever', 'У каждого «Всегда»: вправо, вниз, влево, вверх.'),
          showStep(),
        ],
        reference: { hero: ['start: [*: R3 D2 L3 U2]'], friend: ['start: [*: R3 D2 L3 U2]'] },
      }),
    },
    {
      id: 'candy-10',
      content: level({
        tier: 2,
        kind: 'collect',
        text: 'Финал! Поднимись к другу по лесенке — он крикнет «Ура!» и побежит к флажку.',
        scene: candy(
          mergeMaps(
            'T',
            corridor({
              cols: 8,
              rows: 6,
              start: [0, 5],
              moves: times('R1 U1', 3),
              flag: false,
              stars: [2, 4],
            }),
            corridor({ cols: 8, rows: 6, start: [3, 2], moves: 'R4', actor: 'A' }),
          ),
        ),
        allowed: [...TIER1_ARROWS, 'control_repeat', 'looks_say', 'event_touch'],
        goals: [
          { kind: 'collectAll' },
          reach('friend', 7, 2),
          { kind: 'say', text: 'Ура!', actor: 'friend' },
        ],
        stars: { two: { maxBlocks: 8 }, three: { maxBlocks: 6 } },
        hints: [
          say('Герою — лесенка с «Повтори». Другу — программа «Касается друга».'),
          highlight('event_touch'),
          showStep(),
        ],
        reference: { hero: ['start: [3: R1 U1]'], friend: ['start: ', 'touch:actor: S:Ура! R4'] },
      }),
    },
  ],
};
