import { test, expect } from '@playwright/test';

test('program selection shows the configured active term', async ({ page }) => {
  await page.route('**/api/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        _id: 'settings-test',
        activeTerm: '1st Semester 2026-2027',
        enrollmentOpen: true,
        systemMaintenance: false,
        announcement: '',
      }),
    });
  });

  await page.goto(process.env.TEST_APP_URL || '/');
  await page.getByRole('button', { name: 'Student Portal', exact: true }).click();
  await page.getByRole('button', { name: 'Start New Application' }).click();
  await page.getByText('New Student', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Continue Enrollment' }).click();

  await expect(page.getByText(/^\d(?:st|nd) Semester \d{4}-\d{4}$/)).toBeVisible({ timeout: 5000 });
});
