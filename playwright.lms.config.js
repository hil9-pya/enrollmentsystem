import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'lms-class-loading.spec.js',
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'npm run client -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/tests/fixtures/lms-class-harness.html',
    reuseExistingServer: false,
  },
});
