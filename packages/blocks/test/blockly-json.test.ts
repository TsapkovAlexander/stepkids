import { describe, expect, it } from 'vitest';
import {
  LIT_BOOL,
  LIT_NUMBER,
  LIT_TEXT,
  blocklyDefinitions,
  defaultCatalog,
  normalizeForBlockly,
  targetToWorkspace,
  withScripts,
  workspaceToScripts,
  type BlockNode,
  type ProgramDoc,
} from '../src';

let seq = 0;
const b = (type: string, args?: BlockNode['args'], stacks?: BlockNode['stacks']): BlockNode => ({
  id: `${type}-${++seq}`,
  type,
  ...(args ? { args } : {}),
  ...(stacks ? { stacks } : {}),
});

const roundTrip = (program: ProgramDoc, target: string) =>
  workspaceToScripts(
    JSON.parse(JSON.stringify(targetToWorkspace(program, target, defaultCatalog))),
    defaultCatalog,
  );

describe('Blockly definitions', () => {
  const defs = new Map(blocklyDefinitions(defaultCatalog).map((def) => [def.type, def]));

  it('covers every catalog block and the literal shadows', () => {
    for (const def of defaultCatalog.all()) expect(defs.has(def.type)).toBe(true);
    for (const type of [LIT_NUMBER, LIT_TEXT, LIT_BOOL]) expect(defs.get(type)?.output).toBeNull();
  });

  it('numbers placeholders in order and gives every parameter an argument', () => {
    for (const def of defaultCatalog.all()) {
      const json = defs.get(def.type);
      if (!json) continue;
      const placeholders = [...json.message0.matchAll(/%(\d+)/g)].map((match) => Number(match[1]));
      expect(placeholders).toEqual(json.args0.map((_arg, index) => index + 1));
      const names = json.args0.map((arg) => arg.name);
      for (const param of def.params) expect(names).toContain(param.name);
    }
  });

  it('builds statement rows without gaps', () => {
    const ifElse = defs.get('control_if_else');
    expect(ifElse?.message0).toBe('если %1 то %2');
    expect(ifElse?.args0.map((arg) => arg.type)).toEqual(['input_value', 'input_statement']);
    expect(ifElse?.message1).toBe('иначе %1');
    expect(ifElse?.message2).toBeUndefined();
    expect(defs.get('control_repeat')?.args0.at(-1)).toEqual({
      type: 'input_statement',
      name: 'DO',
    });
  });

  it('maps shapes to connections', () => {
    expect(defs.get('event_start')).toMatchObject({ nextStatement: null });
    expect(defs.get('event_start')?.previousStatement).toBeUndefined();
    expect(defs.get('motion_right')).toMatchObject({
      previousStatement: null,
      nextStatement: null,
    });
    expect(defs.get('op_gt')?.output).toBe('Boolean');
    expect(defs.get('op_add')?.output).toBeNull();
    expect(defs.get('control_if')?.args0[0]).toMatchObject({
      type: 'input_value',
      check: 'Boolean',
    });
    expect(defs.get('looks_costume')?.dynamic).toEqual({ costume: 'costumes' });
  });
});

describe('AST ↔ Blockly workspace', () => {
  it('opens a tier 2 ribbon program without loss', () => {
    const program: ProgramDoc = {
      v: 1,
      targets: [
        {
          target: 'hero',
          scripts: [
            {
              id: 'main',
              blocks: [
                b('event_start'),
                b(
                  'control_repeat',
                  { times: 3 },
                  { DO: [b('motion_right', { count: 2 }), b('looks_say', { text: 'Ура!' })] },
                ),
              ],
            },
            { id: 'tap', blocks: [b('event_tap'), b('looks_costume', { costume: 'next' })] },
          ],
        },
        { target: 'friend', scripts: [{ id: 'f', blocks: [b('event_start'), b('motion_up')] }] },
      ],
    };
    const scripts = roundTrip(program, 'hero');
    const expected = normalizeForBlockly(program, defaultCatalog).targets[0]?.scripts;
    expect(scripts.map(({ x: _x, y: _y, ...script }) => script)).toEqual(expected);
    expect(scripts.map((script) => script.id)).toEqual(['main', 'tap']);
    expect(scripts[1]?.y).toBeGreaterThan(scripts[0]?.y ?? 0);
  });

  it('keeps nested reporters, literals of every type and empty stacks', () => {
    const cond = b('op_gt', { a: b('op_add', { a: b('data_var', { var: 'счёт' }), b: 2 }), b: 5 });
    const program: ProgramDoc = {
      v: 1,
      targets: [
        {
          target: 'hero',
          scripts: [
            {
              id: 's',
              x: 40,
              y: 300,
              blocks: [
                b('event_start'),
                b('data_set', { var: 'готово', value: true }),
                b('data_set', { var: 'имя', value: 'Маша' }),
                b(
                  'control_if_else',
                  { cond },
                  {
                    THEN: [
                      b('looks_say_for', {
                        text: b('op_join', { a: 'счёт: ', b: b('data_var', { var: 'счёт' }) }),
                        seconds: 2,
                      }),
                    ],
                    ELSE: [],
                  },
                ),
              ],
            },
          ],
        },
      ],
    };
    const scripts = roundTrip(program, 'hero');
    expect(scripts).toEqual(normalizeForBlockly(program, defaultCatalog).targets[0]?.scripts);
    expect(scripts[0]?.blocks[1]?.args?.value).toBe(true);
    expect(scripts[0]?.blocks[3]?.stacks?.ELSE).toEqual([]);
  });

  it('reads what Blockly saves: typed-in values, shadows under blocks, new stacks', () => {
    const scripts = workspaceToScripts(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'event_start',
              id: 'h',
              x: 10.6,
              y: 20.2,
              next: {
                block: {
                  type: 'motion_move',
                  id: 'm',
                  inputs: {
                    steps: {
                      shadow: { type: LIT_NUMBER, id: 'sh', fields: { V: 7 } },
                      block: {
                        type: 'op_random',
                        id: 'r',
                        inputs: { from: { shadow: { type: LIT_TEXT, fields: { V: '1' } } } },
                      },
                    },
                  },
                },
              },
            },
            { type: 'motion_right', id: 'loose', fields: { count: '3' } },
          ],
        },
      },
      defaultCatalog,
    );
    expect(scripts[0]).toMatchObject({ id: 's-h', x: 11, y: 20 });
    expect(scripts[0]?.blocks[1]?.args?.steps).toMatchObject({
      id: 'r',
      type: 'op_random',
      args: { from: '1' },
    });
    expect(scripts[1]).toMatchObject({
      id: 's-loose',
      blocks: [{ id: 'loose', args: { count: 3 } }],
    });
  });

  it('gives a copied stack its own id and replaces only one actor', () => {
    const scripts = workspaceToScripts(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            { type: 'event_start', id: 'a', data: 'main' },
            { type: 'event_start', id: 'b', data: 'main' },
          ],
        },
      },
      defaultCatalog,
    );
    expect(scripts.map((script) => script.id)).toEqual(['main', 's-b']);
    const program: ProgramDoc = {
      v: 1,
      targets: [
        { target: 'hero', scripts: [] },
        { target: 'cat', scripts: [] },
      ],
    };
    const next = withScripts(program, 'cat', scripts);
    expect(next.targets[0]?.scripts).toEqual([]);
    expect(next.targets[1]?.scripts).toBe(scripts);
    expect(withScripts(program, 'dog', scripts).targets).toHaveLength(3);
  });
});
