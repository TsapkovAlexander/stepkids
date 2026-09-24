import {
  START_BLOCK,
  countBlocks,
  walkProgram,
  type Goal,
  type SceneInput,
  type LevelInput,
  type ProgramDoc,
  type StarsRule,
} from '@stepkids/blocks';
import { TIMING } from './constants';
import { Emitter } from './emitter';
import { EngineError } from './errors';
import { computeStars, evaluateGoals, type GoalStatus } from './goals';
import { Runtime, type RuntimeOptions } from './runtime';
import { GridWorld, type BumpReason, type GridWorldOptions } from './world/grid-world';

export type Failure =
  | { kind: 'bump'; reason: BumpReason; actorId: string; blockId: string | null }
  | { kind: 'error'; code: string; message: string; blockId: string | null }
  | { kind: 'goal'; statuses: GoalStatus[] }
  | { kind: 'manual' }
  | { kind: 'empty' }
  | { kind: 'timeout' };

export interface RunResult {
  success: boolean;
  stars: 0 | 1 | 2 | 3;
  blocks: number;
  steps: number;
  bumps: number;
  timeMs: number;
  goals: GoalStatus[];
  failure: Failure | null;
}

/** The parts of a level a run needs. `LevelContent` satisfies it. */
export interface RunnableLevel {
  scene: SceneInput;
  goals: Goal[];
  stars: StarsRule;
}

export interface LevelRunOptions extends RuntimeOptions, GridWorldOptions {
  /** Hard stop for runs that never finish (headless checks). */
  maxTimeMs?: number;
  /** Scripted taps for headless runs of interactive levels. */
  inputs?: readonly LevelInput[];
}

interface LevelRunEvents {
  finish: RunResult;
}

/** Blocks that loop forever or wait for input make the run "continuous": goals are checked every tick. */
const CONTINUOUS_BLOCKS = new Set(['control_forever', 'event_tap', 'event_touch']);

/**
 * One attempt at a level: world + runtime + goal checking. The animated player and the
 * headless checker drive the very same object, which keeps their verdicts identical.
 */
export class LevelRun {
  readonly world: GridWorld;
  readonly runtime: Runtime;
  readonly events = new Emitter<LevelRunEvents>();
  readonly blocks: number;
  result: RunResult | null = null;
  /** While true, an idle program with "when tapped" scripts waits for the child instead of ending. */
  acceptsInput = true;
  private readonly continuous: boolean;
  private readonly maxTimeMs: number;
  private firstBump: Extract<Failure, { kind: 'bump' }> | null = null;

  constructor(
    readonly level: RunnableLevel,
    readonly program: ProgramDoc,
    options: LevelRunOptions = {},
  ) {
    if (level.scene.kind !== 'grid') throw new EngineError('unsupported_scene');
    this.world = new GridWorld(level.scene, options);
    this.runtime = new Runtime(this.world, program, options);
    this.blocks = countBlocks(program, [START_BLOCK]);
    this.maxTimeMs = options.maxTimeMs ?? Infinity;
    let continuous = false;
    walkProgram(program, (block) => {
      if (CONTINUOUS_BLOCKS.has(block.type)) continuous = true;
    });
    this.continuous = continuous;
    this.runtime.events.on('bump', (event) => {
      this.firstBump ??= {
        kind: 'bump',
        reason: event.reason as BumpReason,
        actorId: event.actorId,
        blockId: event.blockId,
      };
    });
    this.runtime.events.on('error', (event) => {
      this.finish(false, {
        kind: 'error',
        code: event.code,
        message: event.message,
        blockId: event.blockId,
      });
    });
  }

  get timeMs(): number {
    return this.runtime.now;
  }

  get finished(): boolean {
    return this.result !== null;
  }

  start(): void {
    if (this.blocks === 0) {
      this.finish(false, { kind: 'empty' });
      return;
    }
    this.runtime.start();
    this.evaluate();
  }

  advance(dtMs: number): void {
    if (this.result) return;
    this.runtime.tick(dtMs);
    this.evaluate();
  }

  /** Ends the run with a failure from outside (e.g. the headless loop ran out of ticks). */
  abort(failure: Failure): RunResult {
    if (this.runtime.status === 'running') this.runtime.stop();
    this.finish(false, failure);
    return this.result as RunResult;
  }

  /** The child pressed "Стоп": the run ends without a verdict. */
  stop(): void {
    if (this.result) return;
    this.runtime.stop();
  }

  private evaluate(): void {
    if (this.result || this.runtime.status !== 'running') return;
    const goals = evaluateGoals(this.level.goals, { world: this.world, timeMs: this.runtime.now });
    const manual = this.level.goals.some((goal) => goal.kind === 'manual');
    const idle = this.runtime.isIdle();
    const actorsAlive = [...this.world.actors.values()].some((actor) => !actor.stopped);
    const waitingForInput = this.acceptsInput && this.runtime.hasInteractiveHats() && actorsAlive;

    if (goals.met && (idle || this.continuous)) {
      this.finish(true, null, goals.statuses);
    } else if (idle && !waitingForInput) {
      if (manual) this.finish(false, { kind: 'manual' }, goals.statuses);
      else
        this.finish(
          false,
          this.firstBump ?? { kind: 'goal', statuses: goals.statuses },
          goals.statuses,
        );
    } else if (this.runtime.now >= this.maxTimeMs) {
      this.runtime.stop();
      this.finish(false, this.firstBump ?? { kind: 'timeout' }, goals.statuses);
    }
  }

  private finish(success: boolean, failure: Failure | null, goals: GoalStatus[] = []): void {
    if (this.result) return;
    const bumps = this.world.totalBumps();
    this.result = {
      success,
      stars: computeStars(this.level.stars, { success, blocks: this.blocks, bumps }),
      blocks: this.blocks,
      steps: this.runtime.totalSteps,
      bumps,
      timeMs: Math.round(this.runtime.now),
      goals,
      failure,
    };
    if (success && this.runtime.status === 'running') this.runtime.stop();
    this.events.emit('finish', this.result);
  }
}

/** Runs a level without rendering at a fixed 60 Hz tick. */
export function runHeadless(
  level: RunnableLevel,
  program: ProgramDoc,
  options: LevelRunOptions = {},
): RunResult {
  const run = new LevelRun(level, program, { maxTimeMs: 120_000, ...options });
  const inputs = [...(options.inputs ?? [])].sort((a, b) => a.atMs - b.atMs);
  // Without scripted taps nobody will ever tap: an idle program is simply finished.
  run.acceptsInput = inputs.length > 0;
  run.start();
  while (!run.result && run.runtime.status === 'running') {
    while (inputs[0] && inputs[0].atMs <= run.timeMs) {
      const input = inputs.shift();
      if (input && run.world.hasActor(input.tap)) run.runtime.tap(input.tap);
    }
    if (inputs.length === 0) run.acceptsInput = false;
    run.advance(TIMING.tickMs);
  }
  return run.result ?? run.abort({ kind: 'timeout' });
}
