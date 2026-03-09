module.exports = {
  root: true,
  env: {
    es6: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2022
  },
  ignorePatterns: [
    'node_modules/**',
    'miniprogram_npm/**',
    'docs/**'
  ],
  rules: {
    indent: 'off',
    quotes: 'off',
    semi: 'off',
    'no-undef': 'off',
    'no-useless-catch': 'off',
    'no-console': 'off',
    'no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }]
  },
  overrides: [
    {
      files: ['**/*.test.js'],
      env: {
        jest: true
      }
    }
  ],
  globals: {
    wx: 'readonly',
    App: 'readonly',
    Page: 'readonly',
    Component: 'readonly',
    Behavior: 'readonly',
    getApp: 'readonly',
    getCurrentPages: 'readonly',
    __wxConfig: 'readonly'
  }
}
