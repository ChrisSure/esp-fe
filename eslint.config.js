import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        HTMLElement: 'readonly',
        navigator: 'readonly',
        MediaRecorder: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        Audio: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        ErrorEvent: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/**/*.spec.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        expect: 'readonly',
        jasmine: 'readonly',
        spyOn: 'readonly',
        jest: 'readonly',
        global: 'readonly',
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        HTMLElement: 'readonly',
        navigator: 'readonly',
        MediaRecorder: 'readonly',
        MediaStream: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        Audio: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        ErrorEvent: 'readonly',
        ProgressEvent: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        fail: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'coverage/**/*'],
  },
];
