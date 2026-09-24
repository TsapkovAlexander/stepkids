import { DIRECTIONS, type Direction } from '@stepkids/blocks';
import { TIMING } from '../constants';
import { EngineError } from '../errors';
import { FRAME } from '../waits';
import { createAdvancedPrimitives } from './primitives-advanced';
import type { CommandGenerator, ExecContext, PrimitiveRegistry } from './types';

function toDirection(value: unknown): Direction {
  return DIRECTIONS.includes(value as Direction) ? (value as Direction) : 'right';
}

function toCount(value: unknown, fallback = 1): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** One grid cell per iteration; a blocked cell ends the actor's run with a bump. */
function* gridStep(
  ctx: ExecContext,
  dir: Direction,
  count: number,
  blockId: string,
): CommandGenerator {
  const { world, actorId } = ctx;
  if (world.kind !== 'grid') throw new EngineError('unsupported_scene', blockId);
  for (let i = 0; i < count; i += 1) {
    ctx.countStep();
    const plan = world.planStep(actorId, dir, ctx.now());
    if (!plan.ok) {
      world.beginBump(actorId, dir, ctx.now(), TIMING.bumpMs);
      ctx.emit('bump', { actorId, reason: plan.reason, blockId, time: ctx.now() });
      yield* ctx.sleep(TIMING.bumpMs);
      world.markStopped(actorId);
      ctx.stopActor();
    }
    world.beginWalk(actorId, dir, plan.toX, plan.toY, ctx.now(), TIMING.stepMs);
    yield* ctx.sleep(TIMING.stepMs);
    const arrival = world.arrive(actorId, ctx.now());
    for (const item of arrival.collected) {
      ctx.emit('collect', { actorId, itemId: item.id, kind: item.kind, time: ctx.now() });
    }
    if (arrival.teleportTo) {
      world.beginTeleport(
        actorId,
        arrival.teleportTo.x,
        arrival.teleportTo.y,
        ctx.now(),
        TIMING.teleportMs,
      );
      ctx.emit('teleport', { actorId, time: ctx.now() });
      yield* ctx.sleep(TIMING.teleportMs);
      world.arrive(actorId, ctx.now());
    }
  }
}

export function createCorePrimitives(): PrimitiveRegistry {
  const advanced = createAdvancedPrimitives();
  const core: PrimitiveRegistry = {
    commands: {
      'motion.step': (ctx, args, block) =>
        gridStep(ctx, toDirection(args.dir), toCount(args.count), block.id),

      'looks.say': function* (ctx, args) {
        const text = String(args.text ?? '').trim();
        if (!text) return;
        ctx.world.say(ctx.actorId, text, ctx.now());
        ctx.emit('say', { actorId: ctx.actorId, text, time: ctx.now() });
        yield* ctx.speak(text);
        ctx.world.endSay(ctx.actorId, ctx.now() + TIMING.sayTailMs);
      },

      'sound.melody': function* (ctx, args) {
        ctx.emit('sound', {
          actorId: ctx.actorId,
          melody: String(args.melody ?? 'happy'),
          time: ctx.now(),
        });
        yield* ctx.sleep(TIMING.melodyMs);
      },

      'control.wait': (ctx, args) => ctx.sleep(Math.max(0, Number(args.seconds) || 0) * 1000),

      'control.repeat': function* (ctx, args, block) {
        const times = toCount(args.times, 0);
        for (let i = 0; i < times; i += 1) {
          ctx.countStep();
          yield* ctx.execStack(block.stacks?.DO);
          // Yield once per iteration like Scratch: smooth animation, no frozen tab.
          yield FRAME;
        }
      },

      'control.forever': function* (ctx, _args, block) {
        for (;;) {
          ctx.countStep();
          yield* ctx.execStack(block.stacks?.DO);
          yield FRAME;
        }
      },

      'looks.visible': (ctx, args) => {
        ctx.world.setVisible(ctx.actorId, args.visible !== false && args.visible !== 'false');
      },

      'looks.costume': (ctx, args) => {
        ctx.world.setCostume(ctx.actorId, String(args.costume ?? 'next'));
      },
    },
    reporters: {},
  };
  return {
    commands: { ...core.commands, ...advanced.commands },
    reporters: { ...core.reporters, ...advanced.reporters },
  };
}
