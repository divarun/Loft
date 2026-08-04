import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  // `unit` runs pure logic with no browser; `e2e` drives the real app.
  projects: [
    {
      name: 'unit',
      testDir: './tests/unit',
      use: {},
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'], baseURL: BASE_URL },
    },
  ],

  // The games are timing-heavy — retries hide flakes rather than fix them,
  // so keep this at 0 locally and lean on generous per-assertion timeouts.
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 90_000,
  expect: { timeout: 15_000 },

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
