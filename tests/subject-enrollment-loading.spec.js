import { expect, test } from '@playwright/test';

test('missing active student settles curriculum loading state', async ({ page }) => {
  await page.route('**/api/settings', (route) => route.fulfill({ json: {} }));
  await page.goto('/tests/fixtures/subject-enrollment-harness.html');

  await expect(page.getByText('No subjects found.')).toBeVisible();
  await expect(page.getByText('Loading your curriculum...')).toHaveCount(0);
});
