import { test, expect } from '@playwright/test';

test('matching password confirmation creates applicant login before OTP', async ({ page, request }) => {
  const email = `resume-${Date.now()}@example.com`;
  const password = 'Resume1!';

  await page.goto('/');
  await page.getByRole('button').filter({ hasText: 'Student Portal' }).click();
  await page.getByRole('button', { name: 'Start New Application' }).click();
  await page.getByText('New Student', { exact: true }).click();
  await page.getByRole('button', { name: 'Continue Enrollment' }).click();
  await page.locator('select').first().selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);

  await expect.poll(async () => {
    const response = await request.post('/api/students/applicant-login', {
      data: { email, password },
    });
    const body = await response.json().catch(() => ({}));
    return `${response.status()}:${body.error || body.message || ''}`;
  }, { timeout: 5000 }).toBe('200:');
});
