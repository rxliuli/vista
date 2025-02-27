import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      // an example of file based convention,
      // you don't have to follow it
      include: ['src/**/*.test.ts', 'src/**/*.node.test.ts'],
      exclude: ['src/**/*.browser.test.ts'],
      name: 'unit',
      environment: 'node',
      globalSetup: ['./src/setup.ts'],
    },
  },
  {
    test: {
      // an example of file based convention,
      // you don't have to follow it
      include: ['src/**/*.test.ts', 'src/**/*.browser.test.ts'],
      exclude: ['src/**/*.node.test.ts'],
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
