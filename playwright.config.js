// Playwright E2E config.
// Uses the system Chromium when present (e.g. /usr/bin/chromium), otherwise
// falls back to Playwright's bundled browser (CI images ship it).
const { defineConfig } = require('@playwright/test');
const fs = require('fs');

const SYSTEM_CHROMIUM = '/usr/bin/chromium';

module.exports = defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.LANDSCAPE_BASE_URL || 'http://localhost:8899',
    headless: true,
    launchOptions: {
      executablePath: fs.existsSync(SYSTEM_CHROMIUM) ? SYSTEM_CHROMIUM : undefined,
      args: ['--no-sandbox']
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node tests/e2e/static-server.js 8899',
    url: 'http://localhost:8899',
    reuseExistingServer: true,
    timeout: 30_000
  }
});
