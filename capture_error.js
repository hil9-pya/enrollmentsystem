import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('pageerror', exception => {
    console.log(`\n\n=== UNCAUGHT EXCEPTION ===\n${exception.message}\n${exception.stack}\n==========================\n`);
    errors.push(exception);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`Console error: "${msg.text()}"`);
    }
  });

  try {
    console.log('Logging in as adviser to get token...');
    const tokenRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'adviser', password: 'password123' })
    });
    const { token } = await tokenRes.json();

    console.log('Fetching students from admin API...');
    const res = await fetch('http://localhost:5000/api/admin/students', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const students = await res.json();
    
    // Create a NEW student to reproduce the user's flow
    console.log('Creating a completely new student...');
    const regRes = await fetch('http://localhost:5000/api/students/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: 'Test', lastName: 'User', email: 'test.crash@example.com', phone: '0917-123-4567' })
    });
    const newStudent = await regRes.json();
    console.log('Created student:', newStudent.id);

    // Fast track their status to advising_pending by selecting a program
    await fetch(`http://localhost:5000/api/students/${newStudent.id}/select-program`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programId: 'bscs' })
    });

    console.log('Mocking Adviser approval with ONE subject...');
    const subjects = [{ subjectId: 'cs102', sectionId: 'cs102-a' }];
    await fetch(`http://localhost:5000/api/admin/students/${newStudent.id}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ subjects, academicRecord: [], yearLevel: 1 })
    });
    
    await fetch(`http://localhost:5000/api/admin/students/${newStudent.id}/approve-advising`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ notes: 'test' })
    });
    
    // Login as student
    console.log('Logging in as student...');
    await page.goto('http://localhost:5173/student');
    await page.fill('input[type="text"]', newStudent.id);
    await page.click('button:has-text("Resume Application")');
    
    console.log('Waiting for student portal...');
    await page.waitForURL('**/student/portal', { timeout: 10000 });
    console.log('Logged in to student portal!');
    
    await page.waitForTimeout(5000);
    
    if (errors.length === 0) {
      console.log('No crash yet. Unchecking the subject as adviser...');
      // Empty subjects list
      await fetch(`http://localhost:5000/api/admin/students/${newStudent.id}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subjects: [], academicRecord: [], yearLevel: 1 })
      });
      // The status cannot be modified via API easily to pending, wait, is the user doing this?
      // Actually, if we empty it, maybe it crashes?
      console.log('Reloading page...');
      await page.reload();
      await page.waitForTimeout(5000);
    }
    
  } catch (err) {
    console.error('Script Error:', err);
  } finally {
    await browser.close();
  }
})();
