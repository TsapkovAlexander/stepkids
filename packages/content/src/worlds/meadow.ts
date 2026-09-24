import type { WorldSeed } from '@stepkids/blocks';
import { TIER1_ARROWS, level, map } from '../authoring/dsl';

const RIGHT = ['motion_right'];
const say = (text: string) => ({ kind: 'say' as const, text });
const highlight = (blockType: string, text?: string) => ({
  kind: 'highlight' as const,
  blockType,
  ...(text ? { text } : {}),
});
const showStep = (text = 'Смотри, я покажу первый шаг.') => ({ kind: 'showStep' as const, text });

/** World 1 — «Солнечная полянка»: sequences of arrows, counts, first obstacles. */
export const meadow: WorldSeed = {
  id: 'meadow',
  tier: 1,
  order: 1,
  title: 'Солнечная полянка',
  voice: 'Солнечная полянка. Здесь котёнок учится ходить по клеточкам.',
  island: 'meadow',
  unlock: {},
  reward: { characters: ['bunny'] },
  levels: [
    {
      id: 'meadow-01',
      content: level({
        kind: 'reach',
        text: 'Помоги котёнку дойти до флажка!',
        scene: map(['......', 'H.F...', '......', '......']),
        allowed: RIGHT,
        goals: [{ kind: 'reach', x: 2, y: 1 }],
        stars: {},
        hints: [
          say('Нажми на стрелку вправо внизу экрана. Она попадёт в программу.'),
          highlight(
            'motion_right',
            'Вот эта стрелка! Нажми на неё два раза, а потом на зелёную кнопку.',
          ),
          showStep(),
        ],
        reference: 'R2',
      }),
    },
    {
      id: 'meadow-02',
      content: level({
        kind: 'collect',
        text: 'Собери звёздочку и дойди до флажка.',
        scene: map(['......', 'H.*..F', '......', '......']),
        allowed: RIGHT,
        goals: [{ kind: 'collectAll' }, { kind: 'reach', x: 5, y: 1 }],
        stars: { three: { maxBlocks: 5 } },
        hints: [
          say('Посчитай клеточки до флажка. Сколько раз нужно шагнуть вправо?'),
          highlight('motion_right', 'Нужно пять шагов вправо.'),
          showStep(),
        ],
        reference: 'R5',
      }),
    },
    {
      id: 'meadow-03',
      content: level({
        kind: 'reach',
        text: 'Дойди до флажка одним блоком! Нажми на блок и выбери число.',
        scene: map(['......', 'H....F', '......', '......']),
        allowed: RIGHT,
        limit: 1,
        goals: [{ kind: 'reach', x: 5, y: 1 }],
        stars: {},
        hints: [
          say('Нажми на стрелку в программе. Появятся цифры — выбери, сколько шагов сделать.'),
          highlight(
            'motion_right',
            'Добавь одну стрелку, а потом нажми на неё в программе и выбери пять.',
          ),
          showStep('Смотри: одна стрелка и цифра пять.'),
        ],
        reference: 'R5',
      }),
    },
    {
      id: 'meadow-04',
      content: level({
        kind: 'reach',
        text: 'Спустись вниз к флажку.',
        scene: map(['.H....', '......', '......', '.F....']),
        allowed: ['motion_right', 'motion_down'],
        goals: [{ kind: 'reach', x: 1, y: 3 }],
        stars: { two: { maxBlocks: 3 }, three: { maxBlocks: 1 } },
        hints: [
          say('Флажок внизу. Нужна стрелка вниз!'),
          highlight('motion_down', 'Стрелка вниз. Сколько клеточек до флажка?'),
          showStep(),
        ],
        reference: 'D3',
      }),
    },
    {
      id: 'meadow-05',
      content: level({
        kind: 'collect',
        text: 'Собери звёзды: сначала вправо, потом вниз.',
        scene: map(['H..*..', '......', '...*..', '...F..']),
        allowed: ['motion_right', 'motion_down'],
        goals: [{ kind: 'collectAll' }, { kind: 'reach', x: 3, y: 3 }],
        stars: { two: { maxBlocks: 4 }, three: { maxBlocks: 2 } },
        hints: [
          say('Сначала иди вправо до звезды, а потом вниз до флажка.'),
          highlight('motion_right', 'Три шага вправо, потом три шага вниз.'),
          showStep(),
        ],
        reference: 'R3 D3',
      }),
    },
    {
      id: 'meadow-06',
      content: level({
        kind: 'reach',
        text: 'Флажок наверху. Поднимись и иди влево!',
        scene: map(['..F...', '......', '......', '.....H'], { heroDir: 'left' }),
        allowed: TIER1_ARROWS,
        goals: [{ kind: 'reach', x: 2, y: 0 }],
        stars: { two: { maxBlocks: 4 }, three: { maxBlocks: 2 } },
        hints: [
          say('Флажок выше и левее котёнка. Нужны стрелки вверх и влево.'),
          highlight('motion_up', 'Сначала три шага вверх.'),
          showStep(),
        ],
        reference: 'U3 L3',
      }),
    },
    {
      id: 'meadow-07',
      content: level({
        kind: 'reach',
        text: 'На дороге камень. Обойди его!',
        scene: map(['......', 'H.R.F.', '......', 'f....f']),
        allowed: TIER1_ARROWS,
        goals: [{ kind: 'reach', x: 4, y: 1 }],
        stars: { two: { maxBlocks: 5 }, three: { maxBlocks: 3 } },
        hints: [
          say('Через камень пройти нельзя. Обойди его снизу или сверху.'),
          highlight('motion_down', 'Шагни вниз, пройди под камнем и поднимись к флажку.'),
          showStep(),
        ],
        reference: 'D1 R4 U1',
      }),
    },
    {
      id: 'meadow-08',
      content: level({
        kind: 'collect',
        text: 'Собери все звёздочки!',
        scene: map(['H.*...', '......', '..*.*.', 'f.....']),
        allowed: TIER1_ARROWS,
        goals: [{ kind: 'collectAll' }],
        stars: { two: { maxBlocks: 5 }, three: { maxBlocks: 3 } },
        hints: [
          say('Иди от звезды к звезде: вправо, вниз и снова вправо.'),
          highlight('motion_down', 'После первой звезды нужно спуститься вниз.'),
          showStep(),
        ],
        reference: 'R2 D2 R2',
      }),
    },
    {
      id: 'meadow-09',
      content: level({
        kind: 'reach',
        text: 'Подойди к ёжику и скажи «Привет!»',
        scene: map(['f.....', 'H...N.', '......', '.....f']),
        allowed: [...TIER1_ARROWS, 'looks_say'],
        goals: [
          { kind: 'reach', x: 3, y: 1 },
          { kind: 'say', text: 'Привет!' },
        ],
        stars: { two: { maxBlocks: 3 }, three: { maxBlocks: 2 } },
        hints: [
          say('Подойди к ёжику вплотную, а потом добавь блок «Скажи».'),
          highlight('looks_say', 'Вот блок «Скажи». Он говорит «Привет!»'),
          showStep(),
        ],
        reference: 'R3 S:Привет!',
      }),
    },
    {
      id: 'meadow-10',
      content: level({
        kind: 'collect',
        text: 'Собери все звёзды и приходи к флажку на праздник!',
        scene: map(['H.*R....', '...R.*.F', '.f.R....', '....*...', 'f.....f.']),
        allowed: [...TIER1_ARROWS, 'looks_say', 'sound_music'],
        goals: [{ kind: 'collectAll' }, { kind: 'reach', x: 7, y: 1 }],
        stars: { two: { maxBlocks: 7 }, three: { maxBlocks: 5 } },
        hints: [
          say('Камни стоят стеной. Обойди их снизу.'),
          highlight('motion_down', 'После первой звезды спускайся вниз на три клеточки.'),
          showStep(),
        ],
        reference: 'R2 D3 R3 U2 R2',
      }),
    },
  ],
};
