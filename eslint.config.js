import js from '@eslint/js'
import globals from 'globals'
import eslintConfigPrettier from 'eslint-config-prettier'
import typescriptEslint from 'typescript-eslint'

export default [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.worker,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      // Relaxed for upstream-ported code to minimize diff
      'no-useless-assignment': 'warn',
      'no-control-regex': 'warn',
      'no-useless-catch': 'warn',
    },
  },
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: typescriptEslint.parser,
      globals: {
        ...globals.worker,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint.plugin,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      'no-undef': 'off', // TypeScript handles this via tsc
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ['node_modules/', 'dist/', '.wrangler/'],
  },
]
