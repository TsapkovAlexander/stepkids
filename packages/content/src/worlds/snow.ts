import type { WorldSeed } from '@stepkids/blocks';
import { TIER1_ARROWS, corridor, level, map, pathCells, times } from '../authoring/dsl';

const say = (text: string) => ({ kind: 'say' as const, text });
const highlight = (blockType: string, text?: string) => ({
  kind: 'highlight' as const,
  blockType,
  ...(text ? { text } : {}),
});
const showStep = (text = 'Смотри, я покажу первый шаг.') => ({ kind: 'showStep' as const, text });
const snow = (rows: string[], trail = false) => map(rows, { theme: 'snow', trail });
const LOOPS = [...TIER1_ARROWS, 'control_repeat'];
const REPEAT_TIP = say(
  'Добавь «Повтори», нажми на пустое место внутри скобки и положи туда стрелки.',
);

/** World 3 — «Снежные горки»: the repeat loop. Every path repeats itself, so a loop makes it short. */
export const snowWorld: WorldSeed = {
  id: 'snow',
  tier: 2,
  order: 1,
  title: 'Снежные горки',
  voice: 'Снежные горки. Здесь живёт блок «Повтори» — он делает одно и то же много раз.',
  island: 'snow',
  unlock: {},
  reward: { themes: ['snow'] },
  levels: [
    {
      id: 'snow-01',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Поднимись по лесенке! «Повтори» сделает шаги много раз.',
        scene: snow(corridor({ cols: 5, rows: 5, start: [0, 4], moves: times('R1 U1', 4) })),
        allowed: LOOPS,
        goals: [{ kind: 'reach', x: 4, y: 0 }],
        stars: { two: { maxBlocks: 5 }, three: { maxBlocks: 3 } },
        hints: [
          REPEAT_TIP,
          highlight(
            'control_repeat',
            'Вот «Повтори». Внутри — шаг вправо и шаг вверх, четыре раза.',
          ),
          showStep(),
        ],
        reference: '[4: R1 U1]',
      }),
    },
    {
      id: 'snow-02',
      content: level({
        tier: 2,
        kind: 'collect',
        text: 'Спустись по ступенькам и собери все звёзды.',
        scene: snow(
          corridor({ cols: 5, rows: 5, start: [0, 0], moves: times('R1 D1', 4), stars: [2, 4, 6] }),
        ),
        allowed: LOOPS,
        goals: [{ kind: 'collectAll' }, { kind: 'reach', x: 4, y: 4 }],
        stars: { two: { maxBlocks: 5 }, three: { maxBlocks: 3 } },
        hints: [
          say('Ступеньки одинаковые: шаг вправо, шаг вниз. Сколько их?'),
          highlight('control_repeat'),
          showStep(),
        ],
        reference: '[4: R1 D1]',
      }),
    },
    {
      id: 'snow-03',
      content: level({
        tier: 2,
        kind: 'collect',
        text: 'Проедь по волнистой горке и собери звёзды.',
        scene: snow(
          corridor({
            cols: 9,
            rows: 3,
            start: [0, 0],
            moves: times('R2 D2 R2 U2', 2),
            stars: [2, 6],
          }),
        ),
        allowed: LOOPS,
        goals: [{ kind: 'collectAll' }, { kind: 'reach', x: 8, y: 0 }],
        stars: { two: { maxBlocks: 7 }, three: { maxBlocks: 5 } },
        hints: [
          say('Волна повторяется два раза: вправо, вниз, вправо, вверх.'),
          highlight('control_repeat', 'Положи четыре стрелки в «Повтори» и выбери два.'),
          showStep(),
        ],
        reference: '[2: R2 D2 R2 U2]',
      }),
    },
    {
      id: 'snow-04',
      content: level({
        tier: 2,
        kind: 'collect',
        text: 'Забирайся по террасам и собирай звёзды.',
        scene: snow(
          corridor({ cols: 7, rows: 4, start: [0, 3], moves: times('R2 U1', 3), stars: [1, 3, 5] }),
        ),
        allowed: LOOPS,
        goals: [{ kind: 'collectAll' }, { kind: 'reach', x: 6, y: 0 }],
        stars: { two: { maxBlocks: 5 }, three: { maxBlocks: 3 } },
        hints: [
          say('Два шага вправо и один вверх — и так три раза.'),
          highlight('control_repeat'),
          showStep(),
        ],
        reference: '[3: R2 U1]',
      }),
    },
    {
      id: 'snow-05',
      content: level({
        tier: 2,
        kind: 'fix',
        text: 'Почини программу: «Повтори» повторяет слишком мало.',
        scene: snow(corridor({ cols: 9, rows: 5, start: [0, 4], moves: times('R2 U1', 4) })),
        allowed: LOOPS,
        starter: '[2: R2 U1]',
        goals: [{ kind: 'reach', x: 8, y: 0 }],
        stars: { two: { maxBlocks: 4 }, three: { maxBlocks: 3 } },
        hints: [
          say('Запусти и посмотри, где остановился герой. Сколько ещё ступенек?'),
          highlight('control_repeat', 'Нажми на «Повтори» и выбери другое число.'),
          showStep('Здесь четыре ступеньки.'),
        ],
        reference: '[4: R2 U1]',
      }),
    },
    {
      id: 'snow-06',
      content: level({
        tier: 2,
        kind: 'draw',
        text: 'Нарисуй следами такие же зубчики!',
        scene: snow(['.......', '.......', 'H......'], true),
        allowed: LOOPS,
        goals: [{ kind: 'drawShape', cells: pathCells([0, 2], times('U1 R1 D1 R1', 3)) }],
        stars: { two: { maxBlocks: 8 }, three: { maxBlocks: 5 } },
        hints: [
          say('Один зубчик: вверх, вправо, вниз, вправо. Сколько зубчиков на картинке?'),
          highlight('control_repeat'),
          showStep(),
        ],
        reference: '[3: U1 R1 D1 R1]',
      }),
    },
    {
      id: 'snow-07',
      content: level({
        tier: 2,
        kind: 'shorten',
        text: 'Сделай программу короче! Для трёх звёзд хватит трёх блоков.',
        scene: snow(corridor({ cols: 6, rows: 6, start: [0, 5], moves: times('R1 U1', 5) })),
        allowed: LOOPS,
        starter: times('R1 U1', 5),
        goals: [{ kind: 'reach', x: 5, y: 0 }],
        stars: { two: { maxBlocks: 6 }, three: { maxBlocks: 3 } },
        hints: [
          say('Одинаковые пары стрелок можно спрятать в «Повтори».'),
          highlight('control_repeat'),
          showStep(),
        ],
        reference: '[5: R1 U1]',
      }),
    },
    {
      id: 'snow-08',
      content: level({
        tier: 2,
        kind: 'reach',
        text: 'Заберись на вершину и крикни «Я на вершине!»',
        scene: snow(corridor({ cols: 4, rows: 7, start: [0, 6], moves: times('R1 U2', 3) })),
        allowed: [...LOOPS, 'looks_say'],
        goals: [
          { kind: 'reach', x: 3, y: 0 },
          { kind: 'say', text: 'Я на вершине!' },
        ],
        stars: { two: { maxBlocks: 7 }, three: { maxBlocks: 5 } },
        hints: [
          say('Сначала повтори подъём, а после «Повтори» поставь «Скажи».'),
          highlight('looks_say', 'Нажми на «Скажи» и напиши: Я на вершине!'),
          showStep(),
        ],
        reference: '[3: R1 U2] S:Я_на_вершине!',
      }),
    },
    {
      id: 'snow-09',
      content: level({
        tier: 2,
        kind: 'collect',
        text: 'Длинный спуск! Собери все звёзды внизу горы.',
        scene: snow(
          corridor({
            cols: 8,
            rows: 8,
            start: [0, 0],
            moves: times('R1 D1', 7),
            stars: [4, 8, 12],
          }),
        ),
        allowed: LOOPS,
        goals: [{ kind: 'collectAll' }, { kind: 'reach', x: 7, y: 7 }],
        stars: { two: { maxBlocks: 5 }, three: { maxBlocks: 3 } },
        hints: [say('Посчитай ступеньки: их семь.'), highlight('control_repeat'), showStep()],
        reference: '[7: R1 D1]',
      }),
    },
    {
      id: 'snow-10',
      content: level({
        tier: 2,
        kind: 'collect',
        text: 'Две лесенки с площадками. «Повтори» можно положить внутрь «Повтори»!',
        scene: snow(
          corridor({
            cols: 9,
            rows: 7,
            start: [0, 6],
            moves: times(`${times('R1 U1', 3)} R1`, 2),
            stars: [7, 13],
          }),
        ),
        allowed: LOOPS,
        goals: [{ kind: 'collectAll' }, { kind: 'reach', x: 8, y: 0 }],
        stars: { two: { maxBlocks: 7 }, three: { maxBlocks: 5 } },
        hints: [
          say('Лесенка из трёх ступенек и шаг по площадке — это повторяется два раза.'),
          highlight(
            'control_repeat',
            'Большое «Повтори» два раза, а внутри маленькое «Повтори» три раза.',
          ),
          showStep(),
        ],
        reference: '[2: [3: R1 U1] R1]',
      }),
    },
  ],
};
