import js from '@eslint/js'
import globals from 'globals'
import importX, { createNodeResolver } from 'eslint-plugin-import-x'

export default [
  {
    ignores: ['data/**', 'docs/**', '.claudemon-ci/**'],
  },

  js.configs.recommended,

  {
    files: ['**/*.mjs', 'bin/claudemon'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
    plugins: {
      'import-x': importX,
    },
    settings: {
      'import-x/resolver-next': [createNodeResolver()],
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],

      'no-empty': ['error', { allowEmptyCatch: true }],

      'array-callback-return': 'error',
      'no-template-curly-in-string': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',
      'no-self-compare': 'error',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',

      eqeqeq: ['error', 'always', { null: 'ignore' }],

      'no-var': 'error',
      'prefer-const': 'error',
      'no-useless-return': 'error',
      'no-useless-concat': 'error',
      'no-useless-rename': 'error',
      'no-lone-blocks': 'error',
      'no-param-reassign': 'error',
      radix: 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      'import-x/named': 'error',
      'import-x/default': 'error',
      'import-x/namespace': 'error',
      'import-x/export': 'error',
      'import-x/no-unresolved': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-cycle': ['error', { maxDepth: Infinity }],
      'import-x/no-useless-path-segments': 'error',
      'import-x/no-duplicates': 'error',
    },
  },

  {
    files: ['src/*.mjs', 'web/js/**/*.mjs'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', '**/node/**'],
              message:
                'the engine and the client run in the browser — keep Node behind src/node/ and reach it over the API',
            },
          ],
        },
      ],
    },
  },
]
