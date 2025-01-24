import { defineWorkspace } from 'vitest/config'

const browserIncludes = [
  'src/**/*.browser.test.ts',
  'src/**/*.browser.svelte.test.ts',
  'src/**/__tests__/*.browser.ts',
  'src/**/*.browser.ts',
]

export default defineWorkspace([
  {
    test: {
      // an example of file based convention,
      // you don't have to follow it
      include: ['src/**/*.test.ts'],
      exclude: browserIncludes,
      name: 'unit',
      environment: 'node',
    },
  },
  {
    test: {
      // an example of file based convention,
      // you don't have to follow it
      include: browserIncludes,
      exclude: ['src/**/*.test.ts'],
      name: 'browser',
      browser: {
        provider: 'playwright',
        enabled: true,
        instances: [
          { browser: 'chromium' },
          // { browser: 'firefox' },
          // { browser: 'webkit' },
        ],
        headless: true,
      },
      globalSetup: ['./src/setup.ts'],
    },
  },
])
