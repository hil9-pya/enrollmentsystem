import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('pageerror', exception => {
    console.log(`Uncaught exception: "${exception}"`);
    errors.push(exception);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`Console error: "${msg.text()}"`);
    }
  });

  try {
    // 1. Login as Student STU-2026-0000 to select program
    await page.goto('http://localhost:5173/student');
    await page.fill('input[type="email"]', 'STU-2026-0000');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/student/portal', { timeout: 5000 });
    
    // Select BSCS program if asked
    if (await page.isVisible('text="Select Program"')) {
      await page.selectOption('select', 'bscs');
      await page.click('button:has-text("Submit Program")');
      await page.waitForTimeout(1000);
    }
    
    // 2. Login as Adviser to evaluate
    await page.goto('http://localhost:5173/staff/login');
    await page.fill('input[type="text"]', 'adviser');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/staff/portal');
    
    // Go to Adviser dashboard, select STU-2026-0000
    // We'll just call the API directly using fetch in the page to save time
    await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      // Fetch STU-2026-0000
      const res = await fetch('/api/admin/students', { headers: { 'Authorization': `Bearer ${token}` }});
      const data = await res.json();
      const student = data.find(s => s.studentId === 'STU-2026-0000');
      
      // Update subjects, omit one subject (e.g. cs101)
      const subjects = [
        { subjectId: 'cs102', sectionId: 'cs102-a' },
        { subjectId: 'cs103', sectionId: 'cs103-a' }
      ];
      
      await fetch(`/api/admin/students/${student._id}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subjects, academicRecord: [], yearLevel: 1 })
      });
      
      await fetch(`/api/admin/students/${student._id}/approve-advising`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ notes: 'test' })
      });
    });
    console.log('Adviser approved successfully with a dropped subject.');

    // 3. Login back as student
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:5173/student');
    await page.fill('input[type="email"]', 'STU-2026-0000');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for the portal to load and see if there's a crash
    await page.waitForURL('**/student/portal', { timeout: 5000 });
    console.log('Student logged in.');
    await page.waitForTimeout(2000);
    
  } catch (err) {
    console.error('Script Error:', err);
  } finally {
    await browser.close();
  }
})();
