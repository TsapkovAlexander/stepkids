import { describe, expect, it } from 'vitest';
import { defaultCatalog, generateCode, identifier, type BlockNode, type ProgramDoc } from '../src';

const b = (
  type: string,
  args: BlockNode['args'] = {},
  stacks?: BlockNode['stacks'],
): BlockNode => ({
  id: `${type}-${Math.random().toString(36).slice(2, 6)}`,
  type,
  args,
  ...(stacks ? { stacks } : {}),
});

const program = (blocks: BlockNode[], extra: ProgramDoc['targets'] = []): ProgramDoc => ({
  v: 1,
  targets: [
    { target: 'hero', scripts: [{ id: 's', blocks: [b('event_start'), ...blocks] }] },
    ...extra,
  ],
});

describe('code generation', () => {
  const repeat = b(
    'control_repeat',
    { times: 3 },
    { DO: [b('motion_right', { count: 2 }), b('looks_say', { text: 'Ура!' })] },
  );

  it('renders JavaScript with lines mapped to blocks', () => {
    const code = generateCode(program([repeat]), defaultCatalog, 'js', 'hero');
    expect(code.code).toBe(
      [
        'onStart(() => {',
        '    for (let i = 0; i < 3; i++) {',
        '        moveRight(2);',
        '        say("Ура!");',
        '    }',
        '});',
      ].join('\n'),
    );
    expect(code.lines[1]?.blockId).toBe(repeat.id);
    expect(code.lineOf.get(repeat.stacks?.DO?.[1]?.id ?? '')).toBe(3);
  });

  it('renders Python with pass for empty bodies', () => {
    const empty = b('control_forever', {}, { DO: [] });
    const code = generateCode(program([repeat, empty]), defaultCatalog, 'py', 'hero');
    expect(code.code).toBe(
      [
        '@on_start',
        'def main():',
        '    for i in range(3):',
        '        move_right(2)',
        '        say("Ура!")',
        '    while True:',
        '        pass',
      ].join('\n'),
    );
  });

  it('nests reporters and conditions and names variables', () => {
    const cond = b('op_gt', { a: b('data_var', { var: 'мой счёт' }), b: 5 });
    const ifElse = b(
      'control_if_else',
      { cond },
      {
        THEN: [b('looks_say', { text: 'Много' })],
        ELSE: [b('data_change', { var: 'мой счёт', by: 1 })],
      },
    );
    const js = generateCode(program([ifElse]), defaultCatalog, 'js', 'hero').code;
    expect(js).toContain('if ((мой_счёт > 5)) {');
    expect(js).toContain('мой_счёт += 1;');
    const py = generateCode(
      program([b('data_set', { var: 'ok', value: true }), ifElse]),
      defaultCatalog,
      'py',
      'hero',
    ).code;
    expect(py).toContain('ok = True');
    expect(py).toContain('if (мой_счёт > 5):');
    expect(py).toContain('else:');
  });

  it('renders every actor with headers, custom blocks and unknown blocks', () => {
    const define: ProgramDoc['targets'][number] = {
      target: 'cat',
      scripts: [
        {
          id: 'd',
          blocks: [
            b('procedures_define', { name: 'прыжок', params: 'высота, 2раз' }),
            b('motion_change_y', { dy: b('procedures_param', { name: 'высота' }) }),
          ],
        },
        { id: 'loose', blocks: [b('mystery_block')] },
      ],
    };
    const code = generateCode(
      program([b('procedures_call', { name: 'прыжок', arg0: 10, arg1: 2 })], [define]),
      defaultCatalog,
      'py',
    );
    expect(code.code).toContain('# hero');
    expect(code.code).toContain('прыжок(10, 2)');
    expect(code.code).toContain('def прыжок(высота, _2раз):');
    expect(code.code).toContain('    change_y(высота)');
    expect(code.code).toContain('# mystery_block');
  });

  it('makes identifiers from any names', () => {
    expect(identifier('  ')).toBe('x');
    expect(identifier('1st')).toBe('_1st');
    expect(identifier('звёзды!')).toBe('звёзды');
  });
});
