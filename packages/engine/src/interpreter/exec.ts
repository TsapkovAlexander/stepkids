import { isBlockNode, type BlockNode, type Primitive } from '@stepkids/blocks';
import { TIMING, estimateSpeechMs } from '../constants';
import { EngineError } from '../errors';
import type { Runtime, Thread } from '../runtime';
import type { Wait } from '../waits';
import type { Args, CommandGenerator, ExecContext } from './types';

/** Thrown inside a thread to end it (and, for bumps, the actor's other threads). */
export class StopSignal {
  constructor(readonly scope: 'thread' | 'actor') {}
}

const GATE: Wait = { kind: 'gate' };

export function createExecContext(runtime: Runtime, thread: Thread): ExecContext {
  const { catalog, primitives, world } = runtime;

  const emit: ExecContext['emit'] = (event, payload) => runtime.events.emit(event, payload);

  function resolveArgs(block: BlockNode): Args {
    const def = catalog.require(block.type);
    const args: Args = { ...def.behavior.with };
    for (const param of def.params) {
      const raw = catalog.normalizeArg(block.type, param.name, block.args?.[param.name]);
      args[param.name] = ctx.evaluate(raw);
    }
    return args;
  }

  /** Step-mode gate and highlighting before a block starts. */
  function* enterBlock(block: BlockNode): CommandGenerator {
    if (runtime.stepMode) {
      while (runtime.stepMode && runtime.stepBudget <= 0) yield GATE;
      if (runtime.stepMode) runtime.stepBudget -= 1;
    }
    thread.activeBlock = block.id;
    emit('blockStart', { threadId: thread.id, actorId: thread.actorId, blockId: block.id });
  }

  function* execBlock(block: BlockNode): CommandGenerator {
    const def = catalog.get(block.type);
    if (!def) throw new EngineError('unknown_block', block.id);
    if (def.shape === 'hat') return;
    const command = primitives.commands[def.behavior.primitive];
    if (!command) throw new EngineError('unknown_block', block.id);
    yield* enterBlock(block);
    ctx.countStep();
    const run = command(ctx, resolveArgs(block), block);
    if (run) yield* run;
    emit('blockEnd', { threadId: thread.id, actorId: thread.actorId, blockId: block.id });
  }

  const ctx: ExecContext = {
    actorId: thread.actorId,
    world,
    runtime,
    params: [],
    emit,
    now: () => runtime.now,

    *sleep(ms) {
      if (ms <= 0) return;
      yield { kind: 'until', until: runtime.now + ms };
    },

    *speak(text) {
      const estimate = estimateSpeechMs(text);
      const latch = runtime.speak(thread.actorId, text);
      if (latch) {
        // Real speech decides the length; the estimate only bounds it from both sides.
        const until = runtime.now + Math.min(estimate, TIMING.sayMinMs);
        yield { kind: 'latch', latch, until, timeout: runtime.now + estimate + TIMING.sayMaxMs };
      } else {
        yield { kind: 'until', until: runtime.now + estimate };
      }
    },

    *execStack(blocks) {
      for (const block of blocks ?? []) yield* execBlock(block);
    },

    evaluate(value: Primitive | BlockNode | undefined): Primitive {
      if (!isBlockNode(value)) return value ?? '';
      const def = catalog.get(value.type);
      const reporter = def && primitives.reporters[def.behavior.primitive];
      if (!reporter) throw new EngineError('unknown_block', value.id);
      ctx.countStep();
      return reporter(ctx, resolveArgs(value), value);
    },

    countStep: () => runtime.countStep(),

    stopActor(): never {
      runtime.stopActorThreads(thread.actorId);
      throw new StopSignal('actor');
    },

    stopThread(): never {
      throw new StopSignal('thread');
    },
  };
  return ctx;
}
