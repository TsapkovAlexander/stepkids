import type { Primitive } from '@stepkids/blocks';
import { EngineError } from '../errors';
import { FRAME } from '../waits';
import type { FreeWorld } from '../world/free-world';
import type { CommandGenerator, ExecContext, PrimitiveRegistry } from './types';

/** Scratch-like conversions: non-numbers count as 0, "false"/"0"/"" are false. */
export function toNumber(value: Primitive | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const n = Number(
    String(value ?? '')
      .trim()
      .replace(',', '.'),
  );
  return Number.isFinite(n) ? n : 0;
}

export function toBool(value: Primitive | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  return text !== '' && text !== '0' && text !== 'false';
}

function isNumeric(value: Primitive): boolean {
  if (typeof value === 'number') return true;
  if (typeof value === 'boolean') return false;
  return value.trim() !== '' && Number.isFinite(Number(value.replace(',', '.')));
}

/** Compares numerically when both sides are numbers, otherwise as case-insensitive text. */
export function compare(a: Primitive, b: Primitive): number {
  if (isNumeric(a) && isNumeric(b)) return toNumber(a) - toNumber(b);
  return String(a).toLowerCase().localeCompare(String(b).toLowerCase(), 'ru');
}

function free(ctx: ExecContext, blockId?: string): FreeWorld {
  if (ctx.world.kind !== 'free') throw new EngineError('unsupported_scene', blockId);
  return ctx.world;
}

const LATCH_TIMEOUT_MS = 10 * 60 * 1000;

function* sayFor(ctx: ExecContext, text: string, seconds: number): CommandGenerator {
  ctx.world.say(ctx.actorId, text, ctx.now());
  ctx.emit('say', { actorId: ctx.actorId, text, time: ctx.now() });
  yield* ctx.sleep(Math.max(0, seconds) * 1000);
  ctx.world.endSay(ctx.actorId, ctx.now());
}

export function createAdvancedPrimitives(): PrimitiveRegistry {
  return {
    commands: {
      'control.if': function* (ctx, args, block) {
        if (toBool(args.cond)) yield* ctx.execStack(block.stacks?.THEN);
      },
      'control.ifElse': function* (ctx, args, block) {
        yield* ctx.execStack(toBool(args.cond) ? block.stacks?.THEN : block.stacks?.ELSE);
      },
      'control.while': function* (ctx, _args, block) {
        while (toBool(ctx.evaluate(block.args?.cond))) {
          ctx.countStep();
          yield* ctx.execStack(block.stacks?.DO);
          yield FRAME;
        }
      },
      'control.stop': (ctx, args) => {
        if (args.what === 'all') ctx.runtime.stopAllThreads();
        ctx.stopThread();
      },

      'events.broadcast': (ctx, args) => {
        ctx.runtime.broadcast(String(args.message ?? ''));
      },

      'data.set': (ctx, args) => {
        ctx.runtime.setVariable(String(args.var), args.value ?? 0);
      },
      'data.change': (ctx, args) => {
        const name = String(args.var);
        ctx.runtime.setVariable(name, toNumber(ctx.runtime.getVariable(name)) + toNumber(args.by));
      },

      'sensing.resetTimer': (ctx) => {
        ctx.runtime.resetTimer();
      },
      'sensing.ask': function* (ctx, args) {
        const question = String(args.question ?? '');
        ctx.world.say(ctx.actorId, question, ctx.now());
        ctx.emit('ask', { actorId: ctx.actorId, text: question, time: ctx.now() });
        const latch = ctx.runtime.ask(ctx.actorId, question);
        yield { kind: 'latch', latch, until: ctx.now(), timeout: ctx.now() + LATCH_TIMEOUT_MS };
        ctx.world.endSay(ctx.actorId, ctx.now());
      },

      'looks.sayFor': (ctx, args) => sayFor(ctx, String(args.text ?? ''), toNumber(args.seconds)),

      'free.move': (ctx, args, block) => {
        free(ctx, block.id).moveSteps(ctx.actorId, toNumber(args.steps));
      },
      'free.turn': (ctx, args, block) => {
        free(ctx, block.id).turn(ctx.actorId, toNumber(args.degrees) * (toNumber(args.sign) || 1));
      },
      'free.point': (ctx, args, block) => {
        free(ctx, block.id).pointIn(ctx.actorId, toNumber(args.direction));
      },
      'free.goto': (ctx, args, block) => {
        free(ctx, block.id).goTo(ctx.actorId, toNumber(args.x), toNumber(args.y));
      },
      'free.changeX': (ctx, args, block) => {
        free(ctx, block.id).changeBy(ctx.actorId, toNumber(args.dx), 0);
      },
      'free.changeY': (ctx, args, block) => {
        free(ctx, block.id).changeBy(ctx.actorId, 0, toNumber(args.dy));
      },
      'free.bounce': (ctx, _args, block) => {
        free(ctx, block.id).bounceOnEdge(ctx.actorId);
      },
      'free.glide': function* (ctx, args, block) {
        const world = free(ctx, block.id);
        const ms = Math.max(0, toNumber(args.seconds)) * 1000;
        world.beginGlide(ctx.actorId, toNumber(args.x), toNumber(args.y), ctx.now(), ms);
        yield* ctx.sleep(ms);
        world.finishGlide(ctx.actorId);
      },
      'free.size': (ctx, args, block) => {
        free(ctx, block.id).setSize(ctx.actorId, toNumber(args.size));
      },
      'free.sizeChange': (ctx, args, block) => {
        const world = free(ctx, block.id);
        world.setSize(ctx.actorId, world.actor(ctx.actorId).size + toNumber(args.by));
      },
      'free.front': (ctx, _args, block) => {
        free(ctx, block.id).bringToFront(ctx.actorId);
      },

      'procedures.call': function* (ctx, args, block) {
        const name = String(block.args?.name ?? '');
        const body = ctx.runtime.procedure(ctx.actorId, name);
        if (!body) return;
        if (ctx.params.length >= 64) throw new EngineError('too_many_steps', block.id);
        const names = String(body.blocks[0]?.args?.params ?? '')
          .split(',')
          .map((param) => param.trim())
          .filter(Boolean);
        const values: Record<string, Primitive> = {};
        names.forEach((param, index) => {
          const key = `arg${index}`;
          values[param] = args[key] ?? ctx.evaluate(block.args?.[key]);
        });
        ctx.params.push(values);
        try {
          yield* ctx.execStack(body.blocks.slice(1));
        } finally {
          ctx.params.pop();
        }
      },

      'list.add': (ctx, args) => {
        ctx.runtime.list(String(args.list)).push(args.item ?? '');
      },
      'list.delete': (ctx, args) => {
        const list = ctx.runtime.list(String(args.list));
        const index = Math.round(toNumber(args.index)) - 1;
        if (index >= 0 && index < list.length) list.splice(index, 1);
      },
      'list.clear': (ctx, args) => {
        ctx.runtime.list(String(args.list)).length = 0;
      },

      'clone.create': (ctx) => {
        ctx.runtime.createClone(ctx.actorId);
      },
      'clone.delete': (ctx) => {
        if (ctx.runtime.deleteClone(ctx.actorId)) ctx.stopThread();
      },
    },
    reporters: {
      'data.get': (ctx, args) => ctx.runtime.getVariable(String(args.var)),
      'op.arith': (_ctx, args) => {
        const a = toNumber(args.a);
        const b = toNumber(args.b);
        switch (args.op) {
          case 'sub':
            return a - b;
          case 'mul':
            return a * b;
          case 'div':
            return b === 0 ? 0 : a / b;
          default:
            return a + b;
        }
      },
      'op.random': (ctx, args) => {
        const low = Math.min(toNumber(args.from), toNumber(args.to));
        const high = Math.max(toNumber(args.from), toNumber(args.to));
        const r = ctx.runtime.random();
        if (Number.isInteger(low) && Number.isInteger(high))
          return low + Math.floor(r * (high - low + 1));
        return low + r * (high - low);
      },
      'op.compare': (_ctx, args) => {
        const result = compare(args.a ?? 0, args.b ?? 0);
        return args.op === 'lt' ? result < 0 : args.op === 'gt' ? result > 0 : result === 0;
      },
      'op.logic': (_ctx, args) =>
        args.op === 'or' ? toBool(args.a) || toBool(args.b) : toBool(args.a) && toBool(args.b),
      'op.not': (_ctx, args) => !toBool(args.a),
      'op.join': (_ctx, args) => `${String(args.a ?? '')}${String(args.b ?? '')}`,
      'sensing.touching': (ctx, args) => {
        const target = String(args.target ?? 'edge');
        if (ctx.world.kind === 'free') return ctx.world.touching(ctx.actorId, target, ctx.now());
        const me = ctx.world.actor(ctx.actorId);
        const other = ctx.world.hasActor(target) ? ctx.world.actor(target) : null;
        return !!other && other.x === me.x && other.y === me.y;
      },
      'sensing.distance': (ctx, args) =>
        ctx.world.kind === 'free'
          ? ctx.world.distance(ctx.actorId, String(args.target ?? ''), ctx.now())
          : 0,
      'sensing.answer': (ctx) => ctx.runtime.answer,
      'sensing.timer': (ctx) => Math.round(ctx.runtime.timerSeconds() * 10) / 10,
      'free.x': (ctx, _args, block) =>
        Math.round(free(ctx, block.id).pose(ctx.actorId, ctx.now()).x),
      'free.y': (ctx, _args, block) =>
        Math.round(free(ctx, block.id).pose(ctx.actorId, ctx.now()).y),
      'free.direction': (ctx, _args, block) => free(ctx, block.id).actor(ctx.actorId).direction,
      'procedures.param': (ctx, args) => {
        const name = String(args.name ?? '');
        for (let i = ctx.params.length - 1; i >= 0; i -= 1) {
          const scope = ctx.params[i];
          if (scope && name in scope) return scope[name] ?? 0;
        }
        return 0;
      },
      'list.item': (ctx, args) =>
        ctx.runtime.list(String(args.list))[Math.round(toNumber(args.index)) - 1] ?? '',
      'list.length': (ctx, args) => ctx.runtime.list(String(args.list)).length,
      'list.contains': (ctx, args) =>
        ctx.runtime.list(String(args.list)).some((item) => compare(item, args.item ?? '') === 0),
    },
  };
}
