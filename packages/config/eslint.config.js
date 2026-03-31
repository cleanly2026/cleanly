// @ts-check
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': tsPlugin },
    languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: 2022 } },
    rules: {
      // No hardcoded strings rule — enforced by i18n convention
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[a-zA-Z]{3,}/]',
          message: 'Hardcoded text in JSX. Use i18n keys from @cleanly/i18n instead.',
        },
      ],
    },
  },
]
