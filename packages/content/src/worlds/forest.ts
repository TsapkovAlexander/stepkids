import type { WorldSeed } from '@stepkids/blocks';
import { TIER1_ARROWS, level, map, shape } from '../authoring/dsl';

const say = (text: string) => ({ kind: 'say' as const, text });
const highlight = (blockType: string, text?: string) => ({
  kind: 'highlight' as const,
  blockType,
  ...(text ? { text } : {}),
});
const showStep = (text = 'Смотри, я покажу первый шаг.') => ({ kind: 'showStep' as const, text });

const forestMap = (rows: string[], trail = false) => map(rows, { theme: 'forest', trail });

/** World 2 — «Волшебный лес»: keys and doors, water, portals, fixing and shortening programs. */
export const forest: WorldSeed = {
  id: 'forest',
  tier: 1,
  order: 2,
  title: 'Волшебный лес',
  voice: 'Волшебный лес. Тут есть ключи, двери и волшебные окошки.',
  island: 'forest',
  unlock: { minStars: 15 },
  reward: { characters: ['robot'] },
  levels: [
    {
      id: 'forest-01',
      content: level({
        kind: 'reach',
        text: 'Пройди по лесной тропинке к флажку.',
        scene: forestMap(['H.TTTTT', 'T...TTT', 'TTT.TTT', 'TTT...F', 'TTTTTTT']),
        allowed: TIER1_ARROWS,
        goals: [{ kind: 'reach', x: 6, y: 3 }],
        stars: { two: { maxBlocks: 7 }, three: { maxBlocks: 5 } },
        hints: [
          say('Тропинка петляет. Иди по светлым клеточкам.'),
          highlight('motion_down', 'После первого шага вправо сверни вниз.'),
          showStep(),
        ],
        reference: 'R1 D1 R2 D2 R3',
      }),
    },
    {
      id: 'forest-02',
      content: level({
        kind: 'fix',
        text: 'Почини программу! Котёнок ошибся в одном числе.',
        scene: forestMap(['H...T.', 'TTT...', '......', '...F..']),
        allowed: TIER1_ARROWS,
        starter: 'R2 D3',
        goals: [{ kind: 'reach', x: 3, y: 3 }],
        stars: { two: { maxBlocks: 3 }, three: { maxBlocks: 2 } },
        hints: [
          say('Запусти программу и посмотри, где котёнок ошибается.'),
          highlight('motion_right', 'Нажми на стрелку вправо в программе и поменяй число.'),
          showStep('Вправо нужно шагнуть три раза.'),
        ],
        reference: 'R3 D3',
      }),
    },
    {
      id: 'forest-03',
      content: level({
        kind: 'reach',
        text: 'Возьми ключик, чтобы открыть дверь!',
        scene: forestMap(['..K.TT', 'H...DF', 'TTTTTT']),
        allowed: TIER1_ARROWS,
        goals: [{ kind: 'reach', x: 5, y: 1 }],
        stars: { two: { maxBlocks: 6 }, three: { maxBlocks: 4 } },
        hints: [
          say('Дверь откроется, только если у котёнка есть ключ.'),
          highlight('motion_up', 'Ключ наверху. Поднимись за ним, а потом иди к двери.'),
          showStep(),
        ],
        reference: 'R2 U1 D1 R3',
      }),
    },
    {
      id: 'forest-04',
      content: level({
        kind: 'reach',
        text: 'Обойди озеро: котята не плавают!',
        scene: forestMap(['.......', 'H.WWW..', '..WWW.F', '.......', 'T.....T']),
        allowed: TIER1_ARROWS,
        goals: [{ kind: 'reach', x: 6, y: 2 }],
        stars: { two: { maxBlocks: 5 }, three: { maxBlocks: 3 } },
        hints: [
          say('Озеро можно обойти сверху или снизу.'),
          highlight('motion_up', 'Поднимись на одну клеточку и иди вправо над озером.'),
          showStep(),
        ],
        reference: 'U1 R6 D2',
      }),
    },
    {
      id: 'forest-05',
      content: level({
        kind: 'reach',
        text: 'Прыгни в волшебное окошко!',
        scene: forestMap(['H.1T...', 'TTTT...', '...T...', '...T1.F']),
        allowed: TIER1_ARROWS,
        goals: [{ kind: 'reach', x: 6, y: 3 }],
        stars: { two: { maxBlocks: 3 }, three: { maxBlocks: 2 } },
        hints: [
          say('Окошко переносит котёнка к другому такому же окошку.'),
          highlight('motion_right', 'Шагни вправо в окошко, а потом ещё вправо к флажку.'),
          showStep(),
        ],
        reference: 'R4',
      }),
    },
    {
      id: 'forest-06',
      content: level({
        kind: 'shorten',
        text: 'Сделай программу короче! Для трёх звёзд хватит двух блоков.',
        scene: forestMap(['H.....', '......', '.....F', 'TT..TT']),
        allowed: TIER1_ARROWS,
        starter: 'R1 R1 R1 R1 R1 D1 D1',
        goals: [{ kind: 'reach', x: 5, y: 2 }],
        stars: { two: { maxBlocks: 4 }, three: { maxBlocks: 2 } },
        hints: [
          say('Одинаковые стрелки можно заменить одной с числом.'),
          highlight('motion_right', 'Оставь одну стрелку вправо и выбери число пять.'),
          showStep(),
        ],
        reference: 'R5 D2',
      }),
    },
    {
      id: 'forest-07',
      content: level({
        kind: 'draw',
        text: 'Нарисуй дорожкой такой же квадрат!',
        scene: forestMap(['H.....', '......', '......', 'T....T'], true),
        allowed: TIER1_ARROWS,
        goals: [{ kind: 'drawShape', cells: shape(['###...', '#.#...', '###...']) }],
        stars: { two: { maxBlocks: 6 }, three: { maxBlocks: 4 } },
        hints: [
          say('Котёнок оставляет следы. Обойди квадрат по краю и вернись назад.'),
          highlight('motion_down', 'Вправо, вниз, влево и вверх — по две клеточки.'),
          showStep(),
        ],
        reference: 'R2 D2 L2 U2',
      }),
    },
    {
      id: 'forest-08',
      content: level({
        kind: 'collect',
        text: 'Собери звёзды и крикни «Ура!»',
        scene: forestMap(['H.*...', 'TT.TT.', '..*.*.', 'TT.TT.']),
        allowed: [...TIER1_ARROWS, 'looks_say'],
        goals: [{ kind: 'collectAll' }, { kind: 'say', text: 'Ура!' }],
        stars: { two: { maxBlocks: 6 }, three: { maxBlocks: 4 } },
        hints: [
          say('Сначала собери звёзды, а в конце добавь блок «Скажи».'),
          highlight('looks_say', 'Нажми на блок «Скажи» в программе и выбери «Ура!»'),
          showStep(),
        ],
        reference: 'R2 D2 R2 S:Ура!',
      }),
    },
    {
      id: 'forest-09',
      content: level({
        kind: 'collect',
        text: 'Найди ключ, открой дверь и собери все звёзды!',
        scene: forestMap(['H..T....', '.T.T.*..', '.T*T....', '.T.D*.T.', '.K.T....', '...T....']),
        allowed: TIER1_ARROWS,
        goals: [{ kind: 'collectAll' }],
        stars: { two: { maxBlocks: 8 }, three: { maxBlocks: 6 } },
        hints: [
          say('Ключ лежит внизу. Без ключа дверь не откроется.'),
          highlight('motion_down', 'Спустись вниз за ключом.'),
          showStep(),
        ],
        reference: 'D4 R2 U2 D1 R3 U2',
      }),
    },
    {
      id: 'forest-10',
      content: level({
        kind: 'collect',
        text: 'Большое приключение: собери все звёзды!',
        scene: forestMap(['H.W.1.*.', '*.W.....', '..W.TDT.', '..W.T*T.', '.1W.TTTK', '..W.....']),
        allowed: TIER1_ARROWS,
        goals: [{ kind: 'collectAll' }],
        stars: { two: { maxBlocks: 9 }, three: { maxBlocks: 7 } },
        hints: [
          say('Через речку не перейти. Найди волшебное окошко!'),
          highlight('motion_down', 'Сначала вниз за звездой и к окошку.'),
          showStep(),
        ],
        reference: 'D4 R4 D4 U3 L2 D2',
      }),
    },
  ],
};
