import {
  isBlockNode,
  type ArgValue,
  type BlockNode,
  type Primitive,
  type ProgramDoc,
  type ScriptNode,
} from './ast';
import type { BlockCatalog } from './catalog/catalog';
import type { BlockDef, ParamDef } from './catalog/types';

/**
 * Bridges the program AST and Blockly (tiers 3–4). Everything here is plain JSON, so the
 * lossless round trip — a ribbon program from tier 2 opened in the puzzle editor — is tested
 * without a browser. Blockly block types are the catalog types; literals in value slots are
 * shadow blocks `lit_number` / `lit_text`.
 */

export const LIT_NUMBER = 'lit_number';
export const LIT_TEXT = 'lit_text';
export const LIT_BOOL = 'lit_bool';
const LIT_FIELD = 'V';

export interface BlocklyBlockJson {
  type: string;
  id?: string;
  /** Top blocks carry their script id, so scripts keep their identity across edits. */
  data?: string;
  x?: number;
  y?: number;
  fields?: Record<string, Primitive>;
  inputs?: Record<string, { shadow?: BlocklyBlockJson; block?: BlocklyBlockJson }>;
  next?: { block?: BlocklyBlockJson; shadow?: BlocklyBlockJson };
}

export interface BlocklyWorkspaceJson {
  blocks?: { languageVersion: number; blocks: BlocklyBlockJson[] };
  [key: string]: unknown;
}

/** Blockly block definition (JSON form accepted by `defineBlocksWithJsonArray`). */
export interface BlocklyDefinition {
  type: string;
  message0: string;
  args0: Array<Record<string, unknown>>;
  message1?: string;
  args1?: Array<Record<string, unknown>>;
  message2?: string;
  args2?: Array<Record<string, unknown>>;
  previousStatement?: null;
  nextStatement?: null;
  output?: string | null;
  style: string;
  tooltip: string;
  inputsInline?: boolean;
  /** Our dynamic sources; the web layer swaps these text fields for live dropdowns. */
  dynamic?: Record<string, string>;
}

const STACK_WORDS: Record<string, string> = { DO: '', THEN: '', ELSE: 'иначе' };

function paramArg(param: ParamDef): Record<string, unknown> {
  switch (param.kind) {
    case 'int':
      return {
        type: 'field_number',
        name: param.name,
        value: param.default,
        min: param.min,
        max: param.max,
        precision: 1,
      };
    case 'number':
      return {
        type: 'field_number',
        name: param.name,
        value: param.default,
        ...(param.min !== undefined ? { min: param.min } : {}),
        ...(param.max !== undefined ? { max: param.max } : {}),
      };
    case 'text':
      return { type: 'field_input', name: param.name, text: param.default };
    case 'choice':
      return {
        type: 'field_dropdown',
        name: param.name,
        options: param.options.map((option) => [option.label, option.value]),
      };
    case 'dynamic':
      return { type: 'field_input', name: param.name, text: param.default };
    case 'slot':
      return {
        type: 'input_value',
        name: param.name,
        check: param.accepts === 'condition' ? 'Boolean' : null,
      };
  }
}

/** Blockly definitions for every block of the catalog (plus the literal shadows). */
export function blocklyDefinitions(catalog: BlockCatalog): BlocklyDefinition[] {
  const definitions: BlocklyDefinition[] = [
    // Literal outputs are untyped: a shadow must fit any slot it is restored into.
    {
      type: LIT_NUMBER,
      message0: '%1',
      args0: [{ type: 'field_number', name: LIT_FIELD, value: 0 }],
      output: null,
      style: 'literal_blocks',
      tooltip: '',
    },
    {
      type: LIT_TEXT,
      message0: '%1',
      args0: [{ type: 'field_input', name: LIT_FIELD, text: '' }],
      output: null,
      style: 'literal_blocks',
      tooltip: '',
    },
    {
      type: LIT_BOOL,
      message0: '%1',
      args0: [
        {
          type: 'field_dropdown',
          name: LIT_FIELD,
          options: [
            ['да', 'true'],
            ['нет', 'false'],
          ],
        },
      ],
      output: null,
      style: 'literal_blocks',
      tooltip: '',
    },
  ];
  for (const def of catalog.all()) {
    const text =
      def.text ??
      [def.label.toLowerCase(), ...def.params.map((param) => `{${param.name}}`)].join(' ');
    const used: ParamDef[] = [];
    let message = text.replace(/\{(\w+)\}/g, (_match, name: string) => {
      const param = def.params.find((entry) => entry.name === name);
      if (!param) return '';
      used.push(param);
      return `%${used.length}`;
    });
    for (const param of def.params) {
      if (!used.includes(param)) {
        used.push(param);
        message += ` %${used.length}`;
      }
    }
    const dynamic = Object.fromEntries(
      def.params
        .filter((param) => param.kind === 'dynamic')
        .map((param) => [param.name, param.source]),
    );
    const definition: BlocklyDefinition = {
      type: def.type,
      message0: message.trim(),
      args0: used.map(paramArg),
      style: `${def.category}_blocks`,
      tooltip: def.voice,
      inputsInline: true,
      ...(Object.keys(dynamic).length ? { dynamic } : {}),
    };
    // Blockly reads message1, message2… until the first gap, so extra rows are numbered densely.
    let rows = 0;
    (def.stacks ?? []).forEach((stack, index) => {
      const word = STACK_WORDS[stack] ?? '';
      const statement = { type: 'input_statement', name: stack };
      if (index === 0 && !word) {
        definition.message0 += ` %${definition.args0.length + 1}`;
        definition.args0.push(statement);
        return;
      }
      rows += 1;
      const extra = definition as unknown as Record<string, unknown>;
      extra[`message${rows}`] = word ? `${word} %1` : '%1';
      extra[`args${rows}`] = [statement];
    });
    if (def.shape === 'hat') definition.nextStatement = null;
    if (def.shape === 'command' || def.shape === 'wrapper') {
      definition.previousStatement = null;
      definition.nextStatement = null;
    }
    if (def.shape === 'cap') definition.previousStatement = null;
    if (def.shape === 'value') definition.output = null;
    if (def.shape === 'condition') definition.output = 'Boolean';
    definitions.push(definition);
  }
  return definitions;
}

function literalShadow(id: string, value: Primitive | undefined): BlocklyBlockJson {
  if (typeof value === 'number') return { type: LIT_NUMBER, id, fields: { [LIT_FIELD]: value } };
  if (typeof value === 'boolean')
    return { type: LIT_BOOL, id, fields: { [LIT_FIELD]: String(value) } };
  return { type: LIT_TEXT, id, fields: { [LIT_FIELD]: value === undefined ? '' : String(value) } };
}

function blockToJson(block: BlockNode, catalog: BlockCatalog): BlocklyBlockJson {
  const def = catalog.get(block.type);
  const json: BlocklyBlockJson = { type: block.type, id: block.id };
  const fields: Record<string, Primitive> = {};
  const inputs: NonNullable<BlocklyBlockJson['inputs']> = {};
  for (const param of def?.params ?? []) {
    const value = block.args?.[param.name] ?? param.default;
    if (param.kind === 'slot') {
      const shadowValue = isBlockNode(value) ? param.default : value;
      const entry: { shadow?: BlocklyBlockJson; block?: BlocklyBlockJson } = {};
      if (param.accepts === 'value')
        entry.shadow = literalShadow(`${block.id}:${param.name}`, shadowValue);
      if (isBlockNode(value)) entry.block = blockToJson(value, catalog);
      else if (param.accepts === 'condition' && value !== undefined)
        entry.shadow = literalShadow(`${block.id}:${param.name}`, value);
      if (entry.shadow || entry.block) inputs[param.name] = entry;
    } else if (value !== undefined && !isBlockNode(value)) {
      fields[param.name] = value;
    }
  }
  for (const [name, stack] of Object.entries(block.stacks ?? {})) {
    const chain = chainToJson(stack, catalog);
    if (chain) inputs[name] = { block: chain };
  }
  if (Object.keys(fields).length) json.fields = fields;
  if (Object.keys(inputs).length) json.inputs = inputs;
  return json;
}

function chainToJson(
  blocks: readonly BlockNode[],
  catalog: BlockCatalog,
): BlocklyBlockJson | undefined {
  let head: BlocklyBlockJson | undefined;
  let tail: BlocklyBlockJson | undefined;
  for (const block of blocks) {
    const json = blockToJson(block, catalog);
    if (tail) tail.next = { block: json };
    else head = json;
    tail = json;
  }
  return head;
}

/** Workspace JSON of one actor's scripts; scripts are laid out top to bottom. */
export function targetToWorkspace(
  program: ProgramDoc,
  target: string,
  catalog: BlockCatalog,
): BlocklyWorkspaceJson {
  const scripts = program.targets.find((entry) => entry.target === target)?.scripts ?? [];
  const blocks: BlocklyBlockJson[] = [];
  let y = 24;
  for (const script of scripts) {
    const chain = chainToJson(script.blocks, catalog);
    if (!chain) continue;
    chain.data = script.id;
    chain.x = script.x ?? 24;
    chain.y = script.y ?? y;
    blocks.push(chain);
    y = chain.y + 64 + countChain(script.blocks) * 56;
  }
  return { blocks: { languageVersion: 0, blocks } };
}

function countChain(blocks: readonly BlockNode[]): number {
  return blocks.reduce(
    (sum, block) =>
      sum +
      1 +
      Object.values(block.stacks ?? {}).reduce((inner, stack) => inner + countChain(stack), 0),
    0,
  );
}

function coerce(param: ParamDef | undefined, value: Primitive): Primitive {
  if (!param) return value;
  if (param.kind === 'int' || param.kind === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n : param.default;
  }
  return value;
}

function jsonToBlock(json: BlocklyBlockJson, catalog: BlockCatalog): ArgValue {
  if (json.type === LIT_NUMBER) return Number(json.fields?.[LIT_FIELD] ?? 0);
  if (json.type === LIT_TEXT) return String(json.fields?.[LIT_FIELD] ?? '');
  if (json.type === LIT_BOOL) return String(json.fields?.[LIT_FIELD]) === 'true';
  const def: BlockDef | undefined = catalog.get(json.type);
  const node: BlockNode = {
    id: json.id ?? `${json.type}-${Math.random().toString(36).slice(2, 10)}`,
    type: json.type,
  };
  const args: Record<string, ArgValue> = {};
  for (const [name, value] of Object.entries(json.fields ?? {})) {
    args[name] = coerce(
      def?.params.find((param) => param.name === name),
      value,
    );
  }
  const stacks: Record<string, BlockNode[]> = {};
  for (const [name, input] of Object.entries(json.inputs ?? {})) {
    if (def?.stacks?.includes(name)) {
      stacks[name] = jsonChain(input.block, catalog);
      continue;
    }
    const source = input.block ?? input.shadow;
    if (source) args[name] = jsonToBlock(source, catalog);
  }
  for (const name of def?.stacks ?? []) stacks[name] ??= [];
  if (Object.keys(args).length) node.args = args;
  if (Object.keys(stacks).length) node.stacks = stacks;
  return node;
}

function jsonChain(json: BlocklyBlockJson | undefined, catalog: BlockCatalog): BlockNode[] {
  const blocks: BlockNode[] = [];
  let current = json;
  while (current) {
    const node = jsonToBlock(current, catalog);
    if (isBlockNode(node)) blocks.push(node);
    current = current.next?.block;
  }
  return blocks;
}

/**
 * Scripts of an actor from its workspace JSON. A script keeps the id stored on its top block;
 * a stack the child built in the editor is named after its first block. Loose blocks are kept
 * too (the engine only starts scripts under a hat), so nothing the child made is lost.
 */
export function workspaceToScripts(
  workspace: BlocklyWorkspaceJson,
  catalog: BlockCatalog,
): ScriptNode[] {
  const seen = new Set<string>();
  const scripts: ScriptNode[] = [];
  for (const top of workspace.blocks?.blocks ?? []) {
    const blocks = jsonChain(top, catalog);
    if (blocks.length === 0) continue;
    let id = top.data || `s-${blocks[0]?.id ?? 'empty'}`;
    // A copied stack carries the same data; the first one keeps the id.
    if (seen.has(id)) id = `s-${blocks[0]?.id ?? scripts.length}`;
    seen.add(id);
    scripts.push({
      id,
      blocks,
      ...(top.x !== undefined ? { x: Math.round(top.x) } : {}),
      ...(top.y !== undefined ? { y: Math.round(top.y) } : {}),
    });
  }
  return scripts;
}

/** Replaces an actor's scripts in a program (other actors untouched). */
export function withScripts(
  program: ProgramDoc,
  target: string,
  scripts: ScriptNode[],
): ProgramDoc {
  const exists = program.targets.some((entry) => entry.target === target);
  return {
    ...program,
    targets: exists
      ? program.targets.map((entry) => (entry.target === target ? { ...entry, scripts } : entry))
      : [...program.targets, { target, scripts }],
  };
}

function normalizeBlock(block: BlockNode, catalog: BlockCatalog): BlockNode {
  const def = catalog.get(block.type);
  if (!def) return block;
  const args: Record<string, ArgValue> = {};
  for (const param of def.params) {
    const value = block.args?.[param.name] ?? param.default;
    if (isBlockNode(value)) args[param.name] = normalizeBlock(value, catalog);
    else if (value !== undefined) args[param.name] = value;
    else if (param.kind === 'slot' && param.accepts === 'value') args[param.name] = '';
  }
  const node: BlockNode = { id: block.id, type: block.type };
  if (Object.keys(args).length) node.args = args;
  if (def.stacks?.length) {
    node.stacks = Object.fromEntries(
      def.stacks.map((name) => [
        name,
        (block.stacks?.[name] ?? []).map((inner) => normalizeBlock(inner, catalog)),
      ]),
    );
  }
  return node;
}

/**
 * The program as it reads back from the puzzle editor: every parameter spelled out (Blockly
 * fields always hold a value) and every stack present. Behaviour is identical — the engine
 * falls back to the same defaults — which is what "opens without loss" means.
 */
export function normalizeForBlockly(program: ProgramDoc, catalog: BlockCatalog): ProgramDoc {
  return {
    ...program,
    targets: program.targets.map((target) => ({
      ...target,
      scripts: target.scripts.map((script) => ({
        ...script,
        blocks: script.blocks.map((block) => normalizeBlock(block, catalog)),
      })),
    })),
  };
}
