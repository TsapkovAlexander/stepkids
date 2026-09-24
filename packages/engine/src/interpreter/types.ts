import type { BlockDef, BlockNode, Primitive } from '@stepkids/blocks';
import type { Wait } from '../waits';
import type { Runtime } from '../runtime';
import type { World } from '../world/types';

export type Args = Record<string, Primitive>;

export type CommandGenerator = Generator<Wait, void, void>;

/** Everything a primitive may touch while executing one block in one thread. */
export interface ExecContext {
  readonly actorId: string;
  readonly world: World;
  /** Scheduler services: variables, lists, messages, clones, timer, random, questions. */
  readonly runtime: Runtime;
  /** Parameters of the custom block being executed (innermost call last). */
  readonly params: Array<Record<string, Primitive>>;
  /** Current virtual time. */
  now(): number;
  /** Sleeps for virtual milliseconds (scaled by speed through the host's tick). */
  sleep(ms: number): CommandGenerator;
  /** Waits while the host speaks the phrase (or for an estimated time in headless runs). */
  speak(text: string): CommandGenerator;
  /** Runs a nested stack of blocks. */
  execStack(blocks: readonly BlockNode[] | undefined): CommandGenerator;
  /** Evaluates a literal or a reporter block. */
  evaluate(value: Primitive | BlockNode | undefined): Primitive;
  /** Counts one interpreter step toward the per-tick limit. */
  countStep(): void;
  /** Stops every thread of the actor (after a bump) and ends this thread. */
  stopActor(): never;
  /** Ends the current thread. */
  stopThread(): never;
  /** Reports what happened to the host (sounds, bumps, collected items). */
  emit: RuntimeEmit;
}

export type CommandPrimitive = (
  ctx: ExecContext,
  args: Args,
  block: BlockNode,
) => CommandGenerator | undefined;

export type ReporterPrimitive = (ctx: ExecContext, args: Args, block: BlockNode) => Primitive;

export interface PrimitiveRegistry {
  commands: Record<string, CommandPrimitive>;
  reporters: Record<string, ReporterPrimitive>;
}

export interface BlockEventPayload {
  threadId: number;
  actorId: string;
  blockId: string;
}

export interface RuntimeEvents {
  start: { time: number };
  stop: { time: number; reason: 'user' | 'error' };
  idle: { time: number };
  blockStart: BlockEventPayload;
  blockEnd: BlockEventPayload;
  say: { actorId: string; text: string; time: number };
  sound: { actorId: string; melody: string; time: number };
  bump: { actorId: string; reason: string; blockId: string | null; time: number };
  collect: { actorId: string; itemId: string; kind: string; time: number };
  teleport: { actorId: string; time: number };
  error: { code: string; message: string; blockId: string | null; time: number };
  variable: { name: string; value: Primitive; time: number };
  ask: { actorId: string; text: string; time: number };
}

export type RuntimeEmit = <K extends keyof RuntimeEvents>(
  event: K,
  payload: RuntimeEvents[K],
) => void;

export type { BlockDef };
