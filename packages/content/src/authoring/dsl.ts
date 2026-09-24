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
 *   H hero   A friend (second hero)   N hedgehog (npc)   * star   F flag   R rock   T tree   W water
 *   K key    D door              k/d blue key/door    1 2 3 teleport pairs   f flower
 */
export interface MapOptions {
  theme?: GridTheme;
  /** Character of the second programmable hero drawn as "A". */
  friend?: string;
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
        case 'A':
          actors.push({ id: 'friend', character: options.friend ?? 'bunny', x, y, dir: 'right' });
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
const HATS: Record<string, string> = { start: START_BLOCK, tap: 'event_tap', touch: 'event_touch' };

class IdSource {
  private n = 0;
  next(): string {
    this.n += 1;
    return `b${this.n}`;
  }
}

/** Splits "R1 [2: U1 R1] S:Ура" into top-level tokens, keeping brackets together. */
function tokenize(source: string): string[] {
  const tokens: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of source.trim()) {
    if (char === '[') depth += 1;
    if (char === ']') depth -= 1;
    if (/\s/.test(char) && depth === 0) {
      if (current) tokens.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (depth !== 0) throw new Error(`Unbalanced brackets in "${source}"`);
  if (current) tokens.push(current);
  return tokens;
}

/**
 * Compact programs: "R3 D1" — arrows with counts; "S:Привет!" — say (underscores for spaces);
 * "M:happy" — music; "W2" — wait; "hide" / "show"; "C:party" — costume;
 * "[4: R1 U1]" — repeat 4 times; "[*: R1]" — forever.
 */
export function blocks(source: string, ids: IdSource = new IdSource()): BlockNode[] {
  return tokenize(source).map((token) => parseToken(token, ids));
}

function parseToken(token: string, ids: IdSource): BlockNode {
  const id = ids.next();
  const loop = /^\[(\*|\d+):\s*(.*)\]$/s.exec(token);
  if (loop) {
    const body = blocks(loop[2] ?? '', ids);
    if (loop[1] === '*')
      return { ...defaultCatalog.create('control_forever'), id, stacks: { DO: body } };
    return {
      ...defaultCatalog.create('control_repeat', { times: Number(loop[1]) }),
      id,
      stacks: { DO: body },
    };
  }
  const arrow = ARROWS[token[0] ?? ''];
  if (arrow && /^[RLUD]\d$/.test(token))
    return { ...defaultCatalog.create(arrow, { count: Number(token.slice(1)) }), id };
  if (token.startsWith('S:'))
    return {
      ...defaultCatalog.create('looks_say', { text: token.slice(2).replace(/_/g, ' ') }),
      id,
    };
  if (token.startsWith('M:'))
    return { ...defaultCatalog.create('sound_music', { melody: token.slice(2) }), id };
  if (token.startsWith('C:'))
    return { ...defaultCatalog.create('looks_costume', { costume: token.slice(2) }), id };
  if (/^W\d$/.test(token))
    return { ...defaultCatalog.create('control_wait', { seconds: Number(token.slice(1)) }), id };
  if (token === 'hide') return { ...defaultCatalog.create('looks_hide'), id };
  if (token === 'show') return { ...defaultCatalog.create('looks_show'), id };
  throw new Error(`Unknown program token "${token}"`);
}

/** "tap: R1" → a script with a hat; "touch:star: S:Ура" passes the touch target. */
function script(
  target: string,
  index: number,
  source: string,
  ids: IdSource,
): ProgramDoc['targets'][number]['scripts'][number] {
  const match = /^(start|tap|touch(?::(\w+))?):\s*(.*)$/s.exec(source.trim());
  if (!match) throw new Error(`Script "${source}" must start with start:, tap: or touch:what:`);
  const hatName = (match[1] ?? 'start').split(':')[0] ?? 'start';
  const hatType = HATS[hatName] ?? START_BLOCK;
  const scriptId = target === 'hero' && index === 0 ? 'main' : `${target}-s${index + 1}`;
  const hat: BlockNode =
    hatType === START_BLOCK && scriptId === 'main'
      ? { id: 'start', type: START_BLOCK }
      : {
          ...defaultCatalog.create(hatType, match[2] ? { what: match[2] } : {}),
          id: `${scriptId}-hat`,
        };
  return { id: scriptId, blocks: [hat, ...blocks(match[3] ?? '', ids)] };
}

/** A hero-only ribbon program: `program('R3 D1')`. */
export function program(source: string): ProgramDoc {
  return programs({ hero: [`start: ${source}`] });
}

/** Several scripts per actor: `programs({ hero: ['start: R2', 'tap: U1'], friend: ['start: L2'] })`. */
export function programs(targets: Record<string, string[]>): ProgramDoc {
  const ids = new IdSource();
  return {
    v: PROGRAM_SCHEMA_VERSION,
    targets: Object.entries(targets).map(([target, sources]) => ({
      target,
      scripts: sources.map((source, index) => script(target, index, source, ids)),
    })),
  };
}

export const TIER1_ARROWS = ['motion_right', 'motion_left', 'motion_up', 'motion_down'];
export const TIER2_EVENTS = ['event_start', 'event_tap', 'event_touch'];

export interface CorridorOptions {
  cols: number;
  rows: number;
  start: [number, number];
  /** Moves of the only path, e.g. "R1 U1 R1 U1". */
  moves: string;
  /** Wall symbol around the path (T trees, W water, R rocks). */
  wall?: string;
  /** Put a flag at the end of the path. */
  flag?: boolean;
  /** Stars at the end of these moves (1-based move numbers) or at explicit cells. */
  stars?: number[] | Array<[number, number]>;
  /** Extra symbols placed after the path (x, y, symbol). */
  extra?: Array<[number, number, string]>;
  /** Symbol at the start of the path: H for the hero, A for the friend. */
  actor?: string;
}

/** Draws a map with a single walkable path — loops shine when the path repeats itself. */
export function corridor(options: CorridorOptions): string[] {
  const grid = Array.from({ length: options.rows }, () =>
    Array.from({ length: options.cols }, () => options.wall ?? 'T'),
  );
  let [x, y] = options.start;
  const set = (cx: number, cy: number, symbol: string) => {
    const row = grid[cy];
    if (!row || cx < 0 || cx >= options.cols)
      throw new Error(`Corridor leaves the map at ${cx}:${cy}`);
    row[cx] = symbol;
  };
  set(x, y, options.actor ?? 'H');
  const ends: Array<[number, number]> = [];
  for (const token of options.moves.trim().split(/\s+/)) {
    const dir = token[0];
    const count = Number(token.slice(1));
    for (let i = 0; i < count; i += 1) {
      x += dir === 'R' ? 1 : dir === 'L' ? -1 : 0;
      y += dir === 'D' ? 1 : dir === 'U' ? -1 : 0;
      set(x, y, '.');
    }
    ends.push([x, y]);
  }
  if (options.flag !== false) set(x, y, 'F');
  for (const star of options.stars ?? []) {
    const cell = typeof star === 'number' ? ends[star - 1] : star;
    if (!cell) throw new Error(`No move ${String(star)} for a star`);
    set(cell[0], cell[1], '*');
  }
  for (const [ex, ey, symbol] of options.extra ?? []) set(ex, ey, symbol);
  return grid.map((row) => row.join(''));
}

export interface LevelSpec {
  kind: LevelKind;
  text: string;
  scene: GridSceneInput;
  allowed: string[];
  goals: Goal[];
  stars: StarsRule;
  hints: Hint[];
  /** Hero ribbon source, or several scripts per actor. */
  reference: string | Record<string, string[]>;
  starter?: string | Record<string, string[]>;
  limit?: number;
  tier?: 1 | 2;
  inputs?: Array<{ atMs: number; tap: string }>;
}

const toProgram = (source: string | Record<string, string[]>) =>
  typeof source === 'string' ? program(source) : programs(source);

/** Builds and validates a level; throws on any schema problem. */
export function level(spec: LevelSpec): LevelContent {
  const input: LevelContentInput = {
    schemaVersion: 1,
    kind: spec.kind,
    tier: spec.tier ?? 1,
    taskText: spec.text,
    scene: spec.scene,
    allowedBlocks: spec.allowed,
    goals: spec.goals,
    stars: spec.stars,
    hints: spec.hints,
    reference: toProgram(spec.reference),
    ...(spec.starter ? { starterProgram: toProgram(spec.starter) } : {}),
    ...(spec.limit ? { blockLimit: spec.limit } : {}),
    ...(spec.inputs ? { inputs: spec.inputs } : {}),
  };
  return levelContentSchema.parse(input);
}

/** Cells visited by a path (start included) — for "repeat the picture" goals. */
export function pathCells(start: [number, number], moves: string): Array<[number, number]> {
  let [x, y] = start;
  const cells: Array<[number, number]> = [[x, y]];
  for (const token of moves.trim().split(/\s+/)) {
    for (let i = 0; i < Number(token.slice(1)); i += 1) {
      x += token[0] === 'R' ? 1 : token[0] === 'L' ? -1 : 0;
      y += token[0] === 'D' ? 1 : token[0] === 'U' ? -1 : 0;
      if (!cells.some(([cx, cy]) => cx === x && cy === y)) cells.push([x, y]);
    }
  }
  return cells;
}

/** Overlays maps of the same size: things beat plain ground, ground beats walls. */
export function mergeMaps(wall: string, ...maps: string[][]): string[] {
  const [first, ...rest] = maps;
  if (!first) return [];
  const weak = (symbol: string) => symbol === wall || symbol === '.';
  return first.map((row, y) =>
    [...row]
      .map((symbol, x) => {
        let best = symbol;
        for (const other of rest) {
          const candidate = other[y]?.[x];
          if (!candidate || candidate === wall) continue;
          if (best === wall || (best === '.' && !weak(candidate))) best = candidate;
        }
        return best;
      })
      .join(''),
  );
}

/** Repeats a move sequence: `times('R1 U1', 4)` → "R1 U1 R1 U1 R1 U1 R1 U1". */
export function times(moves: string, count: number): string {
  return Array.from({ length: count }, () => moves).join(' ');
}
