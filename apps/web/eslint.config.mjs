import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default [
  ...nextVitals,
  ...nextTs,
  {
    ignores: ['.next/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts', 'public/sw.js'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
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
