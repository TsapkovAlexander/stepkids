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
import type { Primitive } from '@stepkids/blocks';

import { Latch as LatchImpl } from './waits';
import { scriptOwner, type World } from './world/types';

const EMPTY_GENERATOR: CommandGenerator = (function* () {})();

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
  /** Host question dialog ("спросить и ждать"); resolve the latch and call `answer()`. */
  ask?: (request: SpeechRequest) => void;
  limits?: Partial<Limits>;
  /** Seed of "случайное число" so checks are reproducible. */
  seed?: number;
  /** Answers used by headless runs for "спросить и ждать", in order. */
  answers?: readonly string[];
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
  readonly variables = new Map<string, Primitive>();
  readonly lists = new Map<string, Primitive[]>();
  /** Last answer to "спросить и ждать". */
  answer = '';
  private threads: Thread[] = [];
  private rng: number;
  private timerStart = 0;
  private pendingAsk: Latch | null = null;
  private readonly answers: string[];
  private nextThreadId = 1;
  private tickIndex = 0;
  private stepsThisTick = 0;
  private idle = true;

  constructor(
    readonly world: World,
    readonly program: ProgramDoc,
    private readonly options: RuntimeOptions = {},
  ) {
    this.catalog = options.catalog ?? defaultCatalog;
    this.primitives = options.primitives ?? createCorePrimitives();
    this.limits = { ...LIMITS, ...options.limits };
    this.rng = (options.seed ?? 20260924) >>> 0;
    this.answers = [...(options.answers ?? [])];
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
    return ['event_tap', 'event_touch', 'event_key'].some(
      (hat) => this.scriptsWithHat(hat).length > 0,
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
    this.timerStart = this.now;
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
    if (
      this.status !== 'running' ||
      !this.world.hasActor(actorId) ||
      this.world.actor(actorId).stopped
    )
      return;
    this.startHats('event_tap', () => true, [actorId]);
  }

  /** "When key pressed" — the on-screen arrows on tablets, the keyboard on desktops. */
  keyPress(key: string): void {
    if (this.status !== 'running') return;
    this.startHats('event_key', (args) => args.key === key || args.key === 'any');
  }

  /** "Отправить сообщение": every "когда получено" script with that message (re)starts. */
  broadcast(message: string): void {
    if (this.status !== 'running') return;
    this.startHats('event_message', (args) => String(args.message) === message);
  }

  /** Restarts scripts with the hat for every actor running them (clones included). */
  private startHats(
    hat: string,
    match: (args: Record<string, unknown>) => boolean,
    only?: string[],
  ): void {
    for (const entry of this.scriptsWithHat(hat)) {
      if (!match(entry.script.blocks[0]?.args ?? {})) continue;
      for (const actorId of this.world.actorIds()) {
        if (only && !only.includes(actorId)) continue;
        if (scriptOwner(this.world, actorId) !== entry.actorId || this.world.actor(actorId).stopped)
          continue;
        this.threads = this.threads.filter(
          (thread) => !(thread.script === entry.script && thread.actorId === actorId),
        );
        this.spawn(actorId, entry.script);
      }
    }
  }

  getVariable(name: string): Primitive {
    return this.variables.get(name) ?? 0;
  }

  setVariable(name: string, value: Primitive): void {
    this.variables.set(name, value);
    this.events.emit('variable', { name, value, time: this.now });
  }

  list(name: string): Primitive[] {
    let list = this.lists.get(name);
    if (!list) {
      list = [];
      this.lists.set(name, list);
    }
    return list;
  }

  /** Deterministic PRNG (mulberry32) in [0, 1). */
  random(): number {
    this.rng = (this.rng + 0x6d2b79f5) >>> 0;
    let t = this.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  timerSeconds(): number {
    return (this.now - this.timerStart) / 1000;
  }

  resetTimer(): void {
    this.timerStart = this.now;
  }

  /** Starts a question; the thread waits on the latch until {@link submitAnswer}. */
  ask(actorId: string, question: string): Latch {
    const latch = new LatchImpl();
    this.pendingAsk = latch;
    if (this.options.ask) {
      this.options.ask({ actorId, text: question });
    } else {
      this.answer = this.answers.shift() ?? '';
      latch.resolve();
    }
    return latch;
  }

  submitAnswer(text: string): void {
    this.answer = text;
    this.pendingAsk?.resolve();
    this.pendingAsk = null;
  }

  /** "Клонируй себя" (free scene): the clone runs "когда я начинаю как клон" scripts. */
  createClone(actorId: string): void {
    const world = this.world;
    if (world.kind !== 'free') throw new EngineError('unsupported_scene');
    if (world.cloneTotal() >= this.limits.maxClones) throw new EngineError('too_many_clones');
    const cloneId = world.clone(actorId);
    const owner = scriptOwner(world, cloneId);
    for (const entry of this.scriptsWithHat('event_clone_start')) {
      if (entry.actorId === owner) this.spawn(cloneId, entry.script);
    }
  }

  deleteClone(actorId: string): boolean {
    if (this.world.kind !== 'free' || !this.world.deleteClone(actorId)) return false;
    this.stopActorThreads(actorId);
    return true;
  }

  /** "Стоп всё": every thread ends; the run is then evaluated as finished. */
  stopAllThreads(): void {
    for (const thread of this.threads) thread.done = true;
  }

  /** Body of a custom block defined for the actor (clones use their original's). */
  procedure(actorId: string, name: string): ScriptNode | undefined {
    const owner = scriptOwner(this.world, actorId);
    const scripts = this.program.targets.find((target) => target.target === owner)?.scripts ?? [];
    return scripts.find(
      (script) =>
        script.blocks[0]?.type === 'procedures_define' &&
        String(script.blocks[0]?.args?.name) === name,
    );
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
    // Touches made during this tick start their scripts now, so the run is not taken for finished.
    this.fireTouchHats();
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

  scriptsWithHat(hat: string): Array<{ actorId: string; script: ScriptNode }> {
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
      if (!this.world.hasActor(touch.actorId) || this.world.actor(touch.actorId).stopped) continue;
      for (const entry of hats) {
        const what = entry.script.blocks[0]?.args?.what ?? 'actor';
        if (entry.actorId !== scriptOwner(this.world, touch.actorId) || what !== touch.what)
          continue;
        const running = this.threads.some(
          (thread) =>
            thread.script === entry.script && thread.actorId === touch.actorId && !thread.done,
        );
        if (!running) this.spawn(touch.actorId, entry.script);
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
