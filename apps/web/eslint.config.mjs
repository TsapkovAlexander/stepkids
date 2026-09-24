import nextVitals from 'eslint-config-next/core-web-vitals';
import base from '../../eslint.config.mjs';

export default [
  ...base,
  ...nextVitals,
  {
    ignores: ['.next/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // Native selects/checkboxes/radios are banned in product UI (see CLAUDE.md).
      'no-restricted-syntax': [
        'error',
        { selector: "JSXOpeningElement[name.name='select']", message: 'Use a custom listbox component.' },
        {
          selector: "JSXAttribute[name.name='type'][value.value=/^(checkbox|radio)$/]",
          message: 'Use a custom switch/radiogroup component.',
        },
      ],
    },
  },
];
