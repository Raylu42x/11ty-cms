const globals = {
  browser: {
    window: 'readonly',
    document: 'readonly',
    navigator: 'readonly',
    location: 'readonly',
    fetch: 'readonly',
    console: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    localStorage: 'readonly',
    sessionStorage: 'readonly',
    FormData: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    Event: 'readonly',
    CustomEvent: 'readonly',
    alert: 'readonly',
    confirm: 'readonly',
    prompt: 'readonly',
    EasyMDE: 'readonly',
    API: 'readonly',
    FileBrowser: 'readonly',
    ContentEditor: 'readonly',
  },
  node: {
    require: 'readonly',
    module: 'readonly',
    exports: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    process: 'readonly',
    Buffer: 'readonly',
    console: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    fetch: 'readonly',
    AbortSignal: 'readonly',
    URL: 'readonly',
  },
};

module.exports = [
  {
    ignores: ['node_modules/**', 'repos/**', 'public/css/**', '11ty exaples/**'],
  },
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-implicit-globals': 'error',
    },
  },
  {
    files: ['public/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: globals.browser,
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^(_|API|FileBrowser|ContentEditor)',
        },
      ],
      'no-undef': 'error',
    },
  },
];
