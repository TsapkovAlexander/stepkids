import {
  defaultCatalog,
  levelContentSchema,
  PROGRAM_SCHEMA_VERSION,
  START_BLOCK,
  type BlockNode,
  type Direction,
  type GridActorInput,
  type GridItem,
  type GridSceneInput,
  type GridTheme,
  type Hint,
  type LevelContentInput,
  type LevelContent,
  type ProgramDoc,
  type StarsRule,
  type Goal,
  type LevelKind,
} from '@stepkids/blocks';

/**
 * Authoring DSL for seed levels. Maps are drawn as text so a level can be read at a glance:
 *
 *   H hero   N hedgehog (npc)   * star   F flag   R rock   T tree   W water
 *   K key    D door              k/d blue key/door    1 2 3 teleport pairs   f flower
 */
export interface MapOptions {
  theme?: GridTheme;
  hero?: string;
  heroDir?: Direction;
  trail?: boolean;
}

export function map(rows: readonly string[], options: MapOptions = {}): GridSceneInput {
  const actors: GridActorInput[] = [];
  const items: GridItem[] = [];
  const counters = new Map<string, number>();
  const nextId = (prefix: string) => {
    const n = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, n);
    return `${prefix}${n}`;
  };
  const cols = rows[0]?.length ?? 0;
  rows.forEach((row, y) => {
    if (row.length !== cols) throw new Error(`Row ${y} has ${row.length} cells instead of ${cols}`);
    [...row].forEach((cell, x) => {
      switch (cell) {
        case '.':
          return;
        case 'H':
          actors.push({
            id: 'hero',
            character: options.hero ?? 'kitten',
            x,
            y,
            dir: options.heroDir ?? 'right',
          });
          return;
        case 'N':
          actors.push({ id: nextId('npc'), character: 'hedgehog', x, y, dir: 'left' });
          return;
        case '*':
          items.push({ id: nextId('star'), kind: 'star', x, y });
          return;
        case 'F':
          items.push({ id: nextId('flag'), kind: 'flag', x, y });
          return;
        case 'R':
          items.push({ id: nextId('rock'), kind: 'rock', x, y });
          return;
        case 'T':
          items.push({ id: nextId('tree'), kind: 'tree', x, y });
          return;
        case 'W':
          items.push({ id: nextId('water'), kind: 'water', x, y });
          return;
        case 'K':
          items.push({ id: nextId('key'), kind: 'key', x, y, color: 'yellow' });
          return;
        case 'D':
          items.push({ id: nextId('door'), kind: 'door', x, y, color: 'yellow' });
          return;
        case 'k':
          items.push({ id: nextId('key'), kind: 'key', x, y, color: 'blue' });
          return;
        case 'd':
          items.push({ id: nextId('door'), kind: 'door', x, y, color: 'blue' });
          return;
        case 'f':
          items.push({ id: nextId('flower'), kind: 'flower', x, y });
          return;
        case '1':
        case '2':
        case '3':
          items.push({ id: nextId('portal'), kind: 'teleport', x, y, pair: `p${cell}` });
          return;
        default:
          throw new Error(`Unknown map symbol "${cell}" at ${x}:${y}`);
      }
    });
  });
  return {
    kind: 'grid',
    cols,
    rows: rows.length,
    theme: options.theme ?? 'meadow',
    actors,
    items,
    ...(options.trail ? { trail: true } : {}),
  };
}

/** Cells of a map marked with `#`, for "repeat the picture" goals. */
export function shape(rows: readonly string[]): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  rows.forEach((row, y) => [...row].forEach((cell, x) => cell === '#' && cells.push([x, y])));
  return cells;
}

const ARROWS: Record<string, string> = {
  R: 'motion_right',
  L: 'motion_left',
  U: 'motion_up',
  D: 'motion_down',
};

/**
 * Compact programs: "R3 D1" — arrows with counts, "S:Привет!" — say, "M:happy" — music,
 * "W2" — wait. Tokens are separated by spaces; say phrases use underscores for spaces.
 */
export function blocks(source: string): BlockNode[] {
  // Ids are deterministic so regenerated seeds stay byte-identical.
  return source
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token, index) => ({ ...parseToken(token), id: `b${index + 1}` }));
}

function parseToken(token: string): BlockNode {
  const arrow = ARROWS[token[0] ?? ''];
  if (arrow && /^[RLUD]\d$/.test(token))
    return defaultCatalog.create(arrow, { count: Number(token.slice(1)) });
  if (token.startsWith('S:'))
    return defaultCatalog.create('looks_say', { text: token.slice(2).replace(/_/g, ' ') });
  if (token.startsWith('M:'))
    return defaultCatalog.create('sound_music', { melody: token.slice(2) });
  if (/^W\d$/.test(token))
    return defaultCatalog.create('control_wait', { seconds: Number(token.slice(1)) });
  throw new Error(`Unknown program token "${token}"`);
}

export function program(source: string): ProgramDoc {
  return {
    v: PROGRAM_SCHEMA_VERSION,
    targets: [
      {
        target: 'hero',
        scripts: [{ id: 'main', blocks: [{ id: 'start', type: START_BLOCK }, ...blocks(source)] }],
      },
    ],
  };
}

export const TIER1_ARROWS = ['motion_right', 'motion_left', 'motion_up', 'motion_down'];

export interface LevelSpec {
  kind: LevelKind;
  text: string;
  scene: GridSceneInput;
  allowed: string[];
  goals: Goal[];
  stars: StarsRule;
  hints: Hint[];
  reference: string;
  starter?: string;
  limit?: number;
}

/** Builds and validates a tier 1 level; throws on any schema problem. */
export function level(spec: LevelSpec): LevelContent {
  const input: LevelContentInput = {
    schemaVersion: 1,
    kind: spec.kind,
    tier: 1,
    taskText: spec.text,
    scene: spec.scene,
    allowedBlocks: spec.allowed,
    goals: spec.goals,
    stars: spec.stars,
    hints: spec.hints,
    reference: program(spec.reference),
    ...(spec.starter ? { starterProgram: program(spec.starter) } : {}),
    ...(spec.limit ? { blockLimit: spec.limit } : {}),
  };
  return levelContentSchema.parse(input);
}
