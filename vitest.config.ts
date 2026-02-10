import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    projects: [
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
        plugins: [react()],
        test: {
          // an example of file based convention,
          // you don't have to follow it
          include: [
            'src/**/*.test.ts',
            'src/**/*.browser.test.ts',
            'src/**/*.browser.test.tsx',
          ],
          exclude: ['src/**/*.node.test.ts'],
          name: 'browser',
          browser: {
            provider: 'playwright',
            enabled: true,
            instances: [
              { browser: 'chromium' },
              { browser: 'firefox' },
              // { browser: 'webkit' },
            ],
            headless: true,
          },
          globalSetup: ['./src/setup.ts'],
        },
      },
    ],
  },
})
