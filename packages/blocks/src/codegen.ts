import { isBlockNode, type ArgValue, type BlockNode, type ProgramDoc } from './ast';
import type { BlockCatalog } from './catalog/catalog';
import type { BlockDef } from './catalog/types';

/**
 * Read-only code panel (tier 4): the same AST rendered as JavaScript or Python from the
 * block templates. Every generated line remembers the block it came from, so the panel can
 * highlight the line of the block being executed.
 */

export type CodeLanguage = 'js' | 'py';

export interface GeneratedLine {
  text: string;
  blockId: string | null;
}

export interface GeneratedCode {
  lines: GeneratedLine[];
  code: string;
  /** First line of each block. */
  lineOf: Map<string, number>;
}

const INDENT = '    ';

/** Identifier for names children type ("счёт", "мой блок"): kept readable, made valid. */
export function identifier(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\p{L}\p{N}_]+/gu, '_')
    .replace(/^_+|_+$/g, '');
  const safe = cleaned || 'x';
  return /^\p{N}/u.test(safe) ? `_${safe}` : safe;
}

function literal(value: ArgValue | undefined, language: CodeLanguage): string {
  if (value === undefined) return language === 'py' ? 'None' : 'undefined';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean')
    return language === 'py' ? (value ? 'True' : 'False') : String(value);
  return JSON.stringify(value);
}

const NAME_PARAMS = new Set(['var', 'list', 'name', 'params']);

export class CodeGenerator {
  private lines: GeneratedLine[] = [];

  constructor(
    private readonly catalog: BlockCatalog,
    private readonly language: CodeLanguage,
  ) {}

  generate(program: ProgramDoc, target?: string): GeneratedCode {
    this.lines = [];
    const targets = target
      ? program.targets.filter((entry) => entry.target === target)
      : program.targets;
    targets.forEach((entry, targetIndex) => {
      if (!target) {
        if (targetIndex > 0) this.push('', null);
        this.push(this.language === 'py' ? `# ${entry.target}` : `// ${entry.target}`, null);
      }
      entry.scripts.forEach((script, scriptIndex) => {
        if (scriptIndex > 0) this.push('', null);
        const [hat, ...body] = script.blocks;
        if (hat && this.def(hat)?.shape === 'hat') this.emitBlock(hat, 0, body);
        else this.emitStack(script.blocks, 0);
      });
    });
    const lineOf = new Map<string, number>();
    this.lines.forEach((line, index) => {
      if (line.blockId && !lineOf.has(line.blockId)) lineOf.set(line.blockId, index);
    });
    return { lines: this.lines, code: this.lines.map((line) => line.text).join('\n'), lineOf };
  }

  private def(block: BlockNode): BlockDef | undefined {
    return this.catalog.get(block.type);
  }

  private push(text: string, blockId: string | null): void {
    this.lines.push({ text, blockId });
  }

  private emitStack(blocks: readonly BlockNode[] | undefined, depth: number): void {
    const list = blocks ?? [];
    if (list.length === 0 && this.language === 'py') {
      this.push(`${INDENT.repeat(depth)}pass`, null);
      return;
    }
    for (const block of list) this.emitBlock(block, depth);
  }

  /** Emits a statement; `hatBody` is the rest of a script under its hat. */
  private emitBlock(block: BlockNode, depth: number, hatBody?: readonly BlockNode[]): void {
    const def = this.def(block);
    const pad = INDENT.repeat(depth);
    if (!def) {
      this.push(`${pad}${this.language === 'py' ? '#' : '//'} ${block.type}`, block.id);
      return;
    }
    const template = def.codegen[this.language];
    for (const raw of template.split('\n')) {
      const stack = /^\s*\{(\w+)\}\s*$/.exec(raw);
      const name = stack?.[1];
      if (name && (name === 'STACK' || def.stacks?.includes(name))) {
        this.emitStack(name === 'STACK' ? hatBody : block.stacks?.[name], depth + 1);
        continue;
      }
      this.push(pad + this.fill(raw, def, block), block.id);
    }
  }

  private fill(template: string, def: BlockDef, block: BlockNode): string {
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
      const param = def.params.find((entry) => entry.name === name);
      const value = block.args?.[name] ?? param?.default;
      if (NAME_PARAMS.has(name) && typeof value === 'string') {
        return name === 'params'
          ? value
              .split(',')
              .map((entry) => identifier(entry))
              .filter(Boolean)
              .join(', ')
          : identifier(value);
      }
      return this.expression(value);
    });
  }

  private expression(value: ArgValue | undefined): string {
    if (!isBlockNode(value)) return literal(value, this.language);
    const def = this.def(value);
    if (!def) return this.language === 'py' ? 'None' : 'undefined';
    return this.fill(def.codegen[this.language], def, value);
  }
}

export function generateCode(
  program: ProgramDoc,
  catalog: BlockCatalog,
  language: CodeLanguage,
  target?: string,
): GeneratedCode {
  return new CodeGenerator(catalog, language).generate(program, target);
}
