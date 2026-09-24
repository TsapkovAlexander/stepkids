import { createId, isBlockNode, type ArgValue, type BlockNode, type Primitive } from '../ast';
import type { Tier } from '../level';
import { ADVANCED_BLOCKS } from './advanced-blocks';
import { CORE_BLOCKS } from './core-blocks';
import { LABEL_MAX_LENGTH, type BlockDef, type ParamDef } from './types';

/**
 * Read-only registry of block types. The default catalog is compiled in; the backoffice can
 * provide overrides (labels, voice, enabled flags, blocks built from existing primitives).
 */
export class BlockCatalog {
  private readonly byType = new Map<string, BlockDef>();

  constructor(defs: readonly BlockDef[]) {
    for (const def of defs) {
      if (this.byType.has(def.type)) throw new Error(`Duplicate block type "${def.type}"`);
      if (def.label.length > LABEL_MAX_LENGTH) {
        throw new Error(`Label of "${def.type}" is longer than ${LABEL_MAX_LENGTH} characters`);
      }
      this.byType.set(def.type, def);
    }
  }

  get(type: string): BlockDef | undefined {
    return this.byType.get(type);
  }

  require(type: string): BlockDef {
    const def = this.byType.get(type);
    if (!def) throw new Error(`Unknown block type "${type}"`);
    return def;
  }

  has(type: string): boolean {
    return this.byType.has(type);
  }

  all(): BlockDef[] {
    return [...this.byType.values()];
  }

  /** Palette of a level: allowed blocks in catalog order, hidden ones excluded. */
  palette(allowed: readonly string[]): BlockDef[] {
    return this.all().filter((def) => !def.hidden && allowed.includes(def.type));
  }

  /** Every block available up to a tier — the Workshop palette. */
  upToTier(tier: Tier): BlockDef[] {
    return this.all().filter((def) => !def.hidden && def.tier <= tier);
  }

  isHat(type: string): boolean {
    return this.byType.get(type)?.shape === 'hat';
  }

  /** New block with default arguments and empty stacks. */
  create(type: string, args: Record<string, Primitive> = {}): BlockNode {
    const def = this.require(type);
    const block: BlockNode = { id: createId(), type };
    if (def.params.length > 0) {
      block.args = {};
      for (const param of def.params) {
        const value = args[param.name] ?? defaultValue(param);
        if (value !== undefined) block.args[param.name] = value;
      }
    }
    if (def.stacks?.length) {
      block.stacks = Object.fromEntries(def.stacks.map((name) => [name, [] as BlockNode[]]));
    }
    return block;
  }

  /** Coerces a literal argument into the parameter's range; returns the default if unusable. */
  normalizeArg(type: string, name: string, value: ArgValue | undefined): ArgValue | undefined {
    const param = this.get(type)?.params.find((p) => p.name === name);
    if (!param) return value;
    if (isBlockNode(value)) return param.kind === 'slot' ? value : defaultValue(param);
    return normalizeLiteral(param, value);
  }
}

export function defaultValue(param: ParamDef): Primitive | undefined {
  return param.default;
}

function normalizeLiteral(param: ParamDef, value: Primitive | undefined): Primitive | undefined {
  switch (param.kind) {
    case 'int': {
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(n)) return param.default;
      return Math.min(param.max, Math.max(param.min, Math.round(n)));
    }
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(n)) return param.default;
      const low = param.min ?? -Infinity;
      const high = param.max ?? Infinity;
      return Math.min(high, Math.max(low, n));
    }
    case 'text': {
      const text = value === undefined ? param.default : String(value);
      return text.slice(0, param.maxLength);
    }
    case 'choice':
      return param.options.some((option) => option.value === value) ? value : param.default;
    case 'dynamic':
      return typeof value === 'string' && value.length > 0 ? value : param.default;
    case 'slot':
      return value ?? param.default;
  }
}

export const defaultCatalog = new BlockCatalog([...CORE_BLOCKS, ...ADVANCED_BLOCKS]);
