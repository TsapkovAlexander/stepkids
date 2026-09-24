import type { GridItemKind, GridSceneInput, GridTheme } from '@stepkids/blocks';

/** What a tap on a cell does in the Workshop field editor. */
export type WorkshopTool = 'hero' | 'eraser' | Exclude<GridItemKind, 'teleport'> | 'teleport';

export const WORKSHOP_TOOLS: WorkshopTool[] = [
  'hero',
  'star',
  'rock',
  'tree',
  'water',
  'flag',
  'key',
  'door',
  'teleport',
  'flower',
  'eraser',
];

export const WORKSHOP_SIZE = { cols: 8, rows: 6 } as const;

export interface Cell {
  x: number;
  y: number;
}

export interface EditState {
  scene: GridSceneInput;
  /** First end of a portal waiting for its pair (portals always come in twos). */
  pendingPortal: Cell | null;
}

export function defaultWorkshopScene(heroId: string, theme: GridTheme = 'meadow'): GridSceneInput {
  return {
    kind: 'grid',
    cols: WORKSHOP_SIZE.cols,
    rows: WORKSHOP_SIZE.rows,
    theme,
    actors: [{ id: 'hero', character: heroId, x: 0, y: 0, dir: 'right' }],
    items: [],
  };
}

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

function heroCell(scene: GridSceneInput): Cell | null {
  const hero = scene.actors.find((actor) => actor.id === 'hero') ?? scene.actors[0];
  return hero ? { x: hero.x, y: hero.y } : null;
}

function nextId(scene: GridSceneInput, prefix: string): string {
  let n = scene.items.length + 1;
  const ids = new Set(scene.items.map((item) => item.id));
  while (ids.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** Removes whatever lies on a cell; a portal takes its twin with it. */
function clearCell(scene: GridSceneInput, cell: Cell): GridSceneInput {
  const doomed = scene.items.find((item) => same(item, cell));
  if (!doomed) return scene;
  const pair = doomed.kind === 'teleport' ? doomed.pair : undefined;
  return {
    ...scene,
    items: scene.items.filter(
      (item) => !same(item, cell) && !(pair && item.kind === 'teleport' && item.pair === pair),
    ),
  };
}

/** Applies a tool to a cell. Pure: returns the new scene and pending portal. */
export function applyTool(state: EditState, tool: WorkshopTool, cell: Cell): EditState {
  const { scene } = state;
  const hero = heroCell(scene);
  if (tool === 'hero') {
    const cleared = clearCell(scene, cell);
    return {
      scene: {
        ...cleared,
        actors: cleared.actors.map((actor) =>
          actor.id === 'hero' ? { ...actor, x: cell.x, y: cell.y } : actor,
        ),
      },
      pendingPortal:
        state.pendingPortal && same(state.pendingPortal, cell) ? null : state.pendingPortal,
    };
  }
  if (tool === 'eraser') {
    return {
      scene: clearCell(scene, cell),
      pendingPortal:
        state.pendingPortal && same(state.pendingPortal, cell) ? null : state.pendingPortal,
    };
  }
  // Nothing is placed under the hero.
  if (hero && same(hero, cell)) return state;
  if (tool === 'teleport') {
    const pending = state.pendingPortal;
    if (!pending) return { scene: clearCell(scene, cell), pendingPortal: cell };
    if (same(pending, cell)) return { scene, pendingPortal: null };
    const cleared = clearCell(clearCell(scene, cell), pending);
    const pair = nextId(cleared, 'p');
    return {
      scene: {
        ...cleared,
        items: [
          ...cleared.items,
          { id: `${pair}a`, kind: 'teleport', x: pending.x, y: pending.y, pair },
          { id: `${pair}b`, kind: 'teleport', x: cell.x, y: cell.y, pair },
        ],
      },
      pendingPortal: null,
    };
  }
  const cleared = clearCell(scene, cell);
  const color = tool === 'key' || tool === 'door' ? { color: 'yellow' as const } : {};
  return {
    scene: {
      ...cleared,
      items: [
        ...cleared.items,
        { id: nextId(cleared, tool), kind: tool, x: cell.x, y: cell.y, ...color },
      ],
    },
    pendingPortal:
      state.pendingPortal && same(state.pendingPortal, cell) ? null : state.pendingPortal,
  };
}

export function setTheme(scene: GridSceneInput, theme: GridTheme): GridSceneInput {
  return { ...scene, theme };
}
