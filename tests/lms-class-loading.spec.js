import { expect, test } from '@playwright/test';

test('delayed assignment tab uses parent data with one request per minute', async ({ page }) => {
  let assignmentRequests = 0;
  await page.clock.install({ time: new Date('2026-10-03T08:00:00+08:00') });
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    let data;
    if (pathname.endsWith('/announcements') || pathname.endsWith('/materials') || pathname.endsWith('/roster')) data = [];
    else if (pathname.endsWith('/assignments')) {
      assignmentRequests += 1;
      data = [{ _id: 'assignment-1', title: 'First activity', dueAt: '2026-10-10T08:00:00.000Z', points: 100, status: 'published' }];
    } else data = { offering: { _id: 'offering-1', subjectCode: 'CS 101', sectionCode: 'CS-11M1', subjectName: 'Intro to Computing', instructorName: 'Adrian Cruz', lmsEnabled: true, status: 'active', term: { isActive: true }, schedule: { day: 'MWF', time: '8:00 AM - 9:00 AM', room: '1102' } }, canManage: true, rosterCount: 0 };
    await route.fulfill({ json: { success: true, data } });
  });

  await page.goto('/tests/fixtures/lms-class-harness.html');
  await expect(page.getByRole('heading', { name: 'Intro to Computing' })).toBeVisible();
  await expect.poll(() => assignmentRequests).toBe(1);

  await page.clock.fastForward(61_000);
  await expect.poll(() => assignmentRequests).toBe(2);
  await page.getByRole('button', { name: 'Assignments' }).click();

  await expect(page.getByText('First activity')).toBeVisible();
  expect(assignmentRequests).toBe(2);
});

test('delayed empty assignment tab settles instead of keeping its spinner', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-03T08:00:00+08:00') });
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const data = pathname.endsWith('/assignments') || pathname.endsWith('/announcements') || pathname.endsWith('/materials') || pathname.endsWith('/roster')
      ? []
      : { offering: { _id: 'offering-1', subjectCode: 'CS 101', sectionCode: 'CS-11M1', subjectName: 'Intro to Computing', instructorName: 'Adrian Cruz', lmsEnabled: true, status: 'active', term: { isActive: true }, schedule: { day: 'MWF', time: '8:00 AM - 9:00 AM', room: '1102' } }, canManage: true, rosterCount: 0 };
    await route.fulfill({ json: { success: true, data } });
  });

  await page.goto('/tests/fixtures/lms-class-harness.html');
  await expect(page.getByRole('heading', { name: 'Intro to Computing' })).toBeVisible();
  await page.clock.fastForward(61_000);
  await page.getByRole('button', { name: 'Assignments' }).click();

  await expect(page.getByText('No assignments yet')).toBeVisible();
  await expect(page.getByText('Loading assignments...')).toHaveCount(0);
});

test('assignment deletion survives tab remount before background refresh', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.method() === 'DELETE') {
      await route.fulfill({ json: { success: true, archived: false } });
      return;
    }
    let data;
    if (pathname.endsWith('/announcements') || pathname.endsWith('/materials') || pathname.endsWith('/roster') || pathname.endsWith('/submissions')) data = [];
    else if (pathname.endsWith('/assignments')) data = [{ _id: 'assignment-1', title: 'First activity', dueAt: '2026-10-10T08:00:00.000Z', points: 100, status: 'published' }];
    else data = { offering: { _id: 'offering-1', subjectCode: 'CS 101', sectionCode: 'CS-11M1', subjectName: 'Intro to Computing', instructorName: 'Adrian Cruz', lmsEnabled: true, status: 'active', term: { isActive: true }, schedule: { day: 'MWF', time: '8:00 AM - 9:00 AM', room: '1102' } }, canManage: true, rosterCount: 0 };
    await route.fulfill({ json: { success: true, data } });
  });

  await page.goto('/tests/fixtures/lms-class-harness.html');
  await page.getByRole('button', { name: 'Assignments' }).click();
  await page.getByText('First activity').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('No assignments yet')).toBeVisible();

  await page.getByRole('button', { name: 'Course home' }).click();
  await page.getByRole('button', { name: 'Assignments' }).click();
  await expect(page.getByText('No assignments yet')).toBeVisible();
  await expect(page.getByText('First activity')).toHaveCount(0);
});
