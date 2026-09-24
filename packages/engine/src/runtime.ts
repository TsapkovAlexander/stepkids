import {
  defaultCatalog,
  walkProgram,
  type BlockCatalog,
  type ProgramDoc,
  type ScriptNode,
} from '@stepkids/blocks';
import { LIMITS, type Limits } from './constants';
import { Emitter } from './emitter';
import { EngineError, type RuntimeErrorCode } from './errors';
import { createExecContext, StopSignal } from './interpreter/exec';
import { createCorePrimitives } from './interpreter/primitives';
import type { CommandGenerator, PrimitiveRegistry, RuntimeEvents } from './interpreter/types';
import type { Latch, Wait } from './waits';

const EMPTY_GENERATOR: CommandGenerator = (function* () {})();
import type { GridWorld } from './world/grid-world';

export type RuntimeStatus = 'ready' | 'running' | 'stopped' | 'error';

export interface SpeechRequest {
  actorId: string;
  text: string;
}

export interface RuntimeOptions {
  catalog?: BlockCatalog;
  primitives?: PrimitiveRegistry;
  /** Host speech synthesis; returns a latch resolved when the phrase is spoken. */
  speak?: (request: SpeechRequest) => Latch | null;
  limits?: Partial<Limits>;
}

export interface Thread {
  readonly id: number;
  readonly actorId: string;
  readonly script: ScriptNode;
  generator: CommandGenerator;
  wait: Wait | null;
  /** Tick index when the thread last yielded a frame wait. */
  yieldedAt: number;
  activeBlock: string | null;
  done: boolean;
}

/**
 * Scratch-like scheduler: every script runs in its own cooperative thread, threads run
 * one after another once per tick and give way on waits, animations and loop iterations.
 */
export class Runtime {
  readonly events = new Emitter<RuntimeEvents>();
  readonly catalog: BlockCatalog;
  readonly primitives: PrimitiveRegistry;
  readonly limits: Limits;
  status: RuntimeStatus = 'ready';
  now = 0;
  totalSteps = 0;
  error: EngineError | null = null;
  /** Step mode: blocks wait at their boundary until the user grants a step. */
  stepMode = false;
  stepBudget = 0;
  private threads: Thread[] = [];
  private nextThreadId = 1;
  private tickIndex = 0;
  private stepsThisTick = 0;
  private idle = true;

  constructor(
    readonly world: GridWorld,
    readonly program: ProgramDoc,
    private readonly options: RuntimeOptions = {},
  ) {
    this.catalog = options.catalog ?? defaultCatalog;
    this.primitives = options.primitives ?? createCorePrimitives();
    this.limits = { ...LIMITS, ...options.limits };
  }

  get threadCount(): number {
    return this.threads.length;
  }

  /** Ids of blocks being executed right now — the editor highlights them. */
  activeBlockIds(): Set<string> {
    const ids = new Set<string>();
    for (const thread of this.threads) if (thread.activeBlock) ids.add(thread.activeBlock);
    return ids;
  }

  isIdle(): boolean {
    return this.threads.length === 0;
  }

  /** True if the program can still react to taps or keys after its threads finish. */
  hasInteractiveHats(): boolean {
    return (
      this.scriptsWithHat('event_tap').length > 0 || this.scriptsWithHat('event_touch').length > 0
    );
  }

  /** Validates the program and fires "when start" scripts. */
  start(): void {
    if (this.status !== 'ready') return;
    try {
      this.validate();
    } catch (error) {
      this.fail(error);
      return;
    }
    this.status = 'running';
    this.events.emit('start', { time: this.now });
    for (const { actorId, script } of this.scriptsWithHat('event_start'))
      this.spawn(actorId, script);
    this.idle = this.threads.length === 0;
    if (this.idle) this.events.emit('idle', { time: this.now });
  }

  stop(): void {
    if (this.status !== 'running' && this.status !== 'ready') return;
    this.threads = [];
    this.status = 'stopped';
    this.events.emit('stop', { time: this.now, reason: 'user' });
  }

  setStepMode(enabled: boolean): void {
    this.stepMode = enabled;
    if (!enabled) this.stepBudget = 0;
  }

  /** Lets exactly one more block start (step mode). */
  grantStep(): void {
    this.stepBudget += 1;
  }

  /** "When this hero is tapped": restarts the matching scripts. */
  tap(actorId: string): void {
    if (this.status !== 'running' || this.world.actor(actorId).stopped) return;
    for (const entry of this.scriptsWithHat('event_tap')) {
      if (entry.actorId !== actorId) continue;
      this.threads = this.threads.filter((thread) => thread.script !== entry.script);
      this.spawn(entry.actorId, entry.script);
    }
  }

  /** Advances virtual time and runs every ready thread once. */
  tick(dtMs: number): void {
    if (this.status !== 'running') return;
    this.now += dtMs;
    this.tickIndex += 1;
    this.stepsThisTick = 0;
    this.fireTouchHats();
    for (const thread of [...this.threads]) {
      if (thread.done || !this.isReady(thread)) continue;
      this.resume(thread);
      if (this.status !== 'running') return;
    }
    this.threads = this.threads.filter((thread) => !thread.done);
    const idleNow = this.threads.length === 0;
    if (idleNow && !this.idle) this.events.emit('idle', { time: this.now });
    this.idle = idleNow;
  }

  countStep(): void {
    this.totalSteps += 1;
    this.stepsThisTick += 1;
    if (this.stepsThisTick > this.limits.maxStepsPerTick) throw new EngineError('too_many_steps');
  }

  stopActorThreads(actorId: string): void {
    for (const thread of this.threads) if (thread.actorId === actorId) thread.done = true;
  }

  speak(actorId: string, text: string): Latch | null {
    return this.options.speak?.({ actorId, text }) ?? null;
  }

  private validate(): void {
    for (const target of this.program.targets) {
      if (!this.world.hasActor(target.target)) throw new EngineError('unknown_actor');
    }
    walkProgram(this.program, (block) => {
      const def = this.catalog.get(block.type);
      if (!def) throw new EngineError('unknown_block', block.id);
      const primitive = def.behavior.primitive;
      const known =
        def.shape === 'hat' ||
        primitive in this.primitives.commands ||
        primitive in this.primitives.reporters;
      if (!known) throw new EngineError('unknown_block', block.id);
    });
  }

  private scriptsWithHat(hat: string): Array<{ actorId: string; script: ScriptNode }> {
    const result: Array<{ actorId: string; script: ScriptNode }> = [];
    for (const target of this.program.targets) {
      for (const script of target.scripts) {
        if (script.blocks[0]?.type === hat) result.push({ actorId: target.target, script });
      }
    }
    return result;
  }

  private spawn(actorId: string, script: ScriptNode): void {
    if (this.threads.length >= this.limits.maxThreads) {
      this.fail(new EngineError('too_many_threads'));
      return;
    }
    const thread: Thread = {
      id: this.nextThreadId++,
      actorId,
      script,
      generator: EMPTY_GENERATOR,
      wait: null,
      yieldedAt: -1,
      activeBlock: null,
      done: false,
    };
    thread.generator = createExecContext(this, thread).execStack(script.blocks.slice(1));
    this.threads.push(thread);
    this.idle = false;
  }

  private fireTouchHats(): void {
    const touches = this.world.drainTouches();
    if (touches.length === 0) return;
    const hats = this.scriptsWithHat('event_touch');
    for (const touch of touches) {
      if (this.world.actor(touch.actorId).stopped) continue;
      for (const entry of hats) {
        const what = entry.script.blocks[0]?.args?.what ?? 'actor';
        if (entry.actorId !== touch.actorId || what !== touch.what) continue;
        const running = this.threads.some(
          (thread) => thread.script === entry.script && !thread.done,
        );
        if (!running) this.spawn(entry.actorId, entry.script);
      }
    }
  }

  private isReady(thread: Thread): boolean {
    const wait = thread.wait;
    if (!wait) return true;
    switch (wait.kind) {
      case 'frame':
        return this.tickIndex > thread.yieldedAt;
      case 'until':
        return this.now >= wait.until;
      case 'latch':
        return this.now >= wait.until && (wait.latch.resolved || this.now >= wait.timeout);
      case 'gate':
        return !this.stepMode || this.stepBudget > 0;
    }
  }

  private resume(thread: Thread): void {
    thread.wait = null;
    try {
      for (;;) {
        const result = thread.generator.next();
        if (result.done) {
          thread.done = true;
          thread.activeBlock = null;
          return;
        }
        const wait = result.value;
        thread.wait = wait;
        if (wait.kind === 'frame') {
          thread.yieldedAt = this.tickIndex;
          return;
        }
        if (!this.isReady(thread)) return;
        thread.wait = null;
      }
    } catch (error) {
      if (error instanceof StopSignal) {
        thread.done = true;
        thread.activeBlock = null;
        return;
      }
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    let engineError: EngineError;
    if (error instanceof EngineError) {
      engineError = error;
    } else {
      // A bug in a primitive must not freeze the child's screen: stop kindly and log it.
      console.error('[engine] internal error', error);
      engineError = new EngineError('internal');
    }
    this.error = engineError;
    this.status = 'error';
    this.threads = [];
    const code: RuntimeErrorCode = engineError.code;
    this.events.emit('error', {
      code,
      message: engineError.message,
      blockId: engineError.blockId ?? null,
      time: this.now,
    });
    this.events.emit('stop', { time: this.now, reason: 'error' });
  }
}
