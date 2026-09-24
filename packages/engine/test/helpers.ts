import {
  defaultCatalog,
  singleRibbonProgram,
  type BlockNode,
  type GridSceneInput,
  type Primitive,
  type ProgramDoc,
} from '@stepkids/blocks';
import { Runtime, type RuntimeOptions } from '../src/runtime';
import { GridWorld } from '../src/world/grid-world';

export function block(
  type: string,
  args: Record<string, Primitive> = {},
  stacks?: Record<string, BlockNode[]>,
): BlockNode {
  const node = defaultCatalog.create(type, args);
  if (stacks) node.stacks = stacks;
  return node;
}

export const right = (count = 1) => block('motion_right', { count });
export const left = (count = 1) => block('motion_left', { count });
export const up = (count = 1) => block('motion_up', { count });
export const down = (count = 1) => block('motion_down', { count });

export function ribbon(...blocks: BlockNode[]): ProgramDoc {
  return singleRibbonProgram('hero', blocks);
}

export function scene(overrides: Partial<GridSceneInput> = {}): GridSceneInput {
  return {
    kind: 'grid',
    cols: 6,
    rows: 4,
    actors: [{ id: 'hero', character: 'kitten', x: 0, y: 0 }],
    items: [],
    ...overrides,
  };
}

export function setup(
  program: ProgramDoc,
  sceneInput: GridSceneInput = scene(),
  options: RuntimeOptions = {},
) {
  const world = new GridWorld(sceneInput, { costumes: () => ['default', 'party', 'hat'] });
  const runtime = new Runtime(world, program, options);
  return { world, runtime };
}

/** Ticks at 60 Hz until idle or the time budget runs out. */
export function runUntilIdle(runtime: Runtime, maxMs = 60_000): void {
  runtime.start();
  while (runtime.status === 'running' && !runtime.isIdle() && runtime.now < maxMs)
    runtime.tick(1000 / 60);
}

export function ticks(runtime: Runtime, count: number, dt = 1000 / 60): void {
  for (let i = 0; i < count; i += 1) runtime.tick(dt);
}
