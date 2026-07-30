import { test, expect } from '@playwright/test';

test.describe('NCST Enrollment System End-to-End Validation', () => {
  let studentId = '';
  let officialStudentId = '';

  test('should complete the entire enrollment flow successfully', async ({ page }) => {
    // ------------------------------------------------------------
    // 1. Student Portal - Registration
    // ------------------------------------------------------------
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    await page.goto('/');
    
    // Click Student Portal Card
    await page.getByRole('button').filter({ hasText: 'Student Portal' }).click();
    
    // Click "Start New Application"
    await page.getByRole('button', { name: 'Start New Application' }).click();
    
    // ------------------------------------------------------------
    // Step 1: Enrollment Type Selection
    // ------------------------------------------------------------
    await page.locator('text=New Student').first().click();
    await page.getByRole('button', { name: 'Continue Enrollment' }).click();

    // ------------------------------------------------------------
    // Step 2: Program Selection
    // ------------------------------------------------------------
    await page.locator('select').first().selectOption({ label: 'BS Computer Science (College of Computing)' });
    await page.getByRole('button', { name: 'Continue' }).click();

    // ------------------------------------------------------------
    // Step 3: Registration Details (Application Form)
    // ------------------------------------------------------------
    await page.locator('input[placeholder="Juan"]').fill('Jeremiah');
    await page.locator('input[placeholder="Dela Cruz"]').fill('Atayde');
    await page.locator('input[placeholder="juan@email.com"]').fill(`jeremiah.atayde-${Date.now()}@example.com`);
    await page.locator('input[placeholder="0917-123-4567"]').fill('0918-987-6543');
    await page.locator('input[type="date"]').fill('2000-01-01');
    await page.locator('input[placeholder="123 Rizal St., Quezon City"]').fill('123 Rizal St., Quezon City, Cavite');
    
    // Fill password standard fields
    await page.locator('input[placeholder="Create a strong password"]').fill('P@ssword123');
    await page.locator('input[placeholder="Re-enter password"]').fill('P@ssword123');

    // Submit registration (Click Continue)
    await page.getByRole('button', { name: 'Continue' }).click();

    // Wait for the stepper container to load and extract the student ID from the bottom left applicant card
    await page.locator('text=Active Applicant').waitFor();
    const studentIdLocator = page.locator('p.font-mono').first();
    await expect(studentIdLocator).toBeVisible();
    const studentIdText = await studentIdLocator.textContent();
    studentId = studentIdText ? studentIdText.trim() : '';
    console.log(`Successfully registered student ID: ${studentId}`);
    expect(studentId).toMatch(/^APP-\d{4}-\d+/);

    // ------------------------------------------------------------
    // 4. Step 3: Document Uploads
    // ------------------------------------------------------------
    // Wait for document upload inputs to load
    await page.locator('input[type="file"]').first().waitFor({ state: 'attached' });
    
    const requiredDocs = [
      { name: 'form_138.pdf', mimeType: 'application/pdf' },
      { name: 'form_137.pdf', mimeType: 'application/pdf' },
      { name: 'birth_certificate.pdf', mimeType: 'application/pdf' },
      { name: 'good_moral.pdf', mimeType: 'application/pdf' },
      { name: 'photo.jpg', mimeType: 'image/jpeg' },
      { name: 'med_cert.pdf', mimeType: 'application/pdf' },
    ];

    for (let i = 0; i < requiredDocs.length; i++) {
      const doc = requiredDocs[i];
      await page.locator('input[type="file"]').nth(i).setInputFiles({
        name: doc.name,
        mimeType: doc.mimeType,
        buffer: Buffer.from(`dummy content for ${doc.name}`),
      });
      // Wait for corresponding upload card status to show 'Uploaded'
      await page.locator('text=Uploaded').nth(i).waitFor();
    }

    // Submit documents for Admissions verification
    await page.getByRole('button', { name: 'Submit Application', exact: true }).click();
    
    // Confirm the action using our custom modal
    await page.locator('button:has-text("Yes, Submit Application")').last().click();

    // Click Continue to advance to step 5 (Acceptance Letter)
    await page.getByRole('button', { name: 'Continue' }).click();

    // Should now be showing 'Application Under Review'
    await expect(page.locator('text=Application Under Review')).toBeVisible();

    // Exit portal and go back to gateway
    await page.getByRole('button', { name: 'Back to Gateway' }).click();

    // ------------------------------------------------------------
    // 6. Admissions Department - Document Review & Clearance
    // ------------------------------------------------------------
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[type="email"]').fill('admission@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Navigate to Document Verification tab
    await page.getByRole('button', { name: /Applications for Review/ }).click();

    // Select the student in the list
    await page.locator(`tr:has-text("${studentId}")`).getByRole('button', { name: 'View Details' }).click();
    await page.locator('textarea').fill('TOR and Good Moral files are verified.');
    await page.getByRole('button', { name: 'Approve Application' }).click();

    // Confirm the action using our custom modal
    await page.locator('button:has-text("Approve")').last().click();



    // Log out of Staff Portal
    await page.locator('text=Sign Out').click();
    await page.locator('button:has-text("Sign Out")').last().click();

    // ------------------------------------------------------------
    // 7. Adviser Department - Academic Advisory & Subject Clearance
    // ------------------------------------------------------------
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[type="email"]').fill('adviser@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Navigate to Pending Evaluation tab
    await page.getByRole('button', { name: /Pending Evaluation/ }).click();

    // Select the student in the queue
    await page.locator(`button:has-text("${studentId}")`).first().click();
    await page.locator('textarea').fill('All prerequisites verified. Selected standard first term subjects.');
    await page.getByRole('button', { name: 'Approve Evaluation', exact: true }).click();

    // Wait for the student to be removed from the adviser queue (confirms DB save)
    await page.locator(`text=${studentId}`).first().waitFor({ state: 'detached' });

    await page.locator('text=Sign Out').click();
    await page.locator('button:has-text("Sign Out")').last().click();

    // ------------------------------------------------------------
    // 8. Student Portal - Subject Enrollment & Payment Simulation
    // ------------------------------------------------------------
    await page.getByRole('button', { name: 'Student Portal', exact: true }).click();
    await page.locator('input#email').fill(studentId);
    await page.locator('input#password').fill('NCST2026!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Since advising is approved, the portal resumes directly on step 6 (Subject Enrollment)
    await expect(page.locator('text=Subject Enrollment').first()).toBeVisible();

    // Expand "Intro to Computing"
    await page.locator('text=Intro to Computing').first().click();

    // Enroll in the first section
    await page.getByRole('button', { name: 'Enroll', exact: true }).first().click();

    // Proceed to review schedule
    await page.getByRole('button', { name: /Review Schedule/ }).click();

    // Confirm schedule and proceed to payment
    await page.getByRole('button', { name: 'Confirm & Proceed to Payment' }).click();

    // Now on step 7 (Payment)
    await expect(page.locator('text=Tuition Assessment & Payment')).toBeVisible();
    await page.locator('text=Card').click();
    await page.locator('text=Manual Receipt Verification').click();
    await page.getByRole('button', { name: 'Proceed with Payment' }).click();

    // Fill in secure payment details in the validation modal
    await page.locator('input[placeholder="Name on card"]').fill('Jeremiah Atayde');
    await page.locator('input[placeholder="1111 2222 3333 4444"]').fill('1234 5678 1234 5678');
    await page.locator('input[placeholder="MM/YY"]').fill('12/28');
    await page.locator('input[placeholder="123"]').fill('123');

    // Click the Authorize Payment button inside the validation modal form
    await page.locator('button[type="submit"]:has-text("Authorize Payment")').click();

    // Wait for the delay and clearance feedback
    await page.locator('text=Payment Verification Pending').waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Proceed to Verification' }).click();

    // Now on Step 8 (Fulfillment) showing 'Awaiting Accounting Verification'
    await expect(page.locator('text=Awaiting Accounting Verification')).toBeVisible();
    // Exit portal and go back to gateway
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.locator('button:has-text("Sign Out")').last().click();

    // ------------------------------------------------------------
    // 9. Accounting Department - Payment Clearance
    // ------------------------------------------------------------
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[type="email"]').fill('accounting@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Find the row matching the student and click "Verify Payment"
    const verifyPaymentBtn = page.locator(`tr:has-text("${studentId}")`).getByRole('button', { name: 'Verify Payment' });
    await verifyPaymentBtn.click();

    // Now on PaymentVerification view
    await page.getByRole('button', { name: 'Confirm Payment Receipt' }).click();

    // Confirm using custom modal
    await page.getByRole('button', { name: 'Confirm Payment', exact: true }).click();

    // Wait for success toast
    await page.locator('text=Payment confirmed for').waitFor({ state: 'visible' });

    // Wait to return to dashboard (timeout 1500 in the component)
    await page.waitForTimeout(2000);

    await page.locator('text=Sign Out').click();
    await page.locator('button:has-text("Sign Out")').last().click();

    // ------------------------------------------------------------
    // 10. Registrar Department - Final Validation & Certification
    // ------------------------------------------------------------
    await page.getByRole('button', { name: 'Staff / Admin', exact: true }).click();
    await page.locator('input[type="email"]').fill('registrar@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Select the student
    await page.locator(`tr:has-text("${studentId}")`).getByRole('button', { name: 'Validate' }).click();
    await page.getByRole('button', { name: 'Validate Enrollment' }).click();
    
    // Confirm using Registrar's inline prompt
    await page.getByRole('button', { name: 'Officially Enroll', exact: true }).click();

    // Wait for the success flash toast (confirms DB save)
    await page.locator('text=Enrollment validated for').waitFor({ state: 'visible' });

    await page.locator('text=Sign Out').click();
    await page.locator('button:has-text("Sign Out")').last().click();

    // ------------------------------------------------------------
    // 11. Student Portal - Official Enrollment Verified
    // ------------------------------------------------------------
    // Fetch the generated Student ID (STU-XXXX) from the backend
    const studentData = await page.evaluate(async (appId) => {
      const res = await fetch(`/api/students/${appId}`);
      return res.json();
    }, studentId);
    officialStudentId = studentData.studentId;
    console.log(`Generated official Student ID: ${officialStudentId}`);
    expect(officialStudentId).toMatch(/^STU-\d{4}-\d+/);

    await page.getByRole('button', { name: 'Student Portal', exact: true }).click();
    await page.locator('input#email').fill(officialStudentId);
    await page.locator('input#password').fill('NCST2026!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify final screen displays COR generated download buttons and Enrolled banner
    await expect(page.locator('text=Enrollment Complete')).toBeVisible();
    await expect(page.locator('text=Certificate of Registration')).toBeVisible();
  });
});
