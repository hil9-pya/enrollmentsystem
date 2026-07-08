import { test, expect } from '@playwright/test';

test.describe('NCST Enrollment System End-to-End Validation', () => {
  const testEmail = `test.student.${Date.now()}@email.com`;
  let studentId = '';

  test('should complete the entire enrollment flow successfully', async ({ page }) => {
    // ------------------------------------------------------------
    // 1. Student Portal - Registration
    // ------------------------------------------------------------
    await page.goto('/');
    
    // Click Student Portal Card
    await page.getByRole('button').filter({ hasText: 'Student Portal' }).click();
    
    // Click "Start New Application"
    await page.getByRole('button', { name: 'Start New Application' }).click();
    
    // Fill personal info
   await page.locator('input[placeholder="Juan"]').fill('Jeremiah');
await page.locator('input[placeholder="Dela Cruz"]').fill('Atayde');
await page.locator('input[placeholder="juan@email.com"]').fill(`jeremiah.atayde-${Date.now()}@example.com`);
await page.locator('input[placeholder="0917-123-4567"]').fill('0918-987-6543');
    
    // Submit registration
    await page.getByRole('button', { name: 'Start Application' }).click();
    
    // Wait for the stepper container to load and extract the student ID from the bottom left applicant card
    await page.locator('text=Active Applicant').waitFor();
    const studentIdLocator = page.locator('p.font-mono').first();
    await expect(studentIdLocator).toBeVisible();
    const studentIdText = await studentIdLocator.textContent();
    studentId = studentIdText ? studentIdText.trim() : '';
    console.log(`Successfully registered student ID: ${studentId}`);
    expect(studentId).toMatch(/^STU-\d{4}-\d+/);

    // ------------------------------------------------------------
    // 2. Step 1: Enrollment Type Selection
    // ------------------------------------------------------------
    await page.locator('text=New Student').first().click();
    await page.getByRole('button', { name: 'Continue Enrollment' }).click();

    // ------------------------------------------------------------
    // 3. Step 2: Registration Details
    // ------------------------------------------------------------
    await page.locator('input[type="date"]').fill('2000-01-01');
    await page.locator('textarea').fill('123 Rizal St., Quezon City, Cavite');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

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
    await page.getByRole('button', { name: 'Submit Documents' }).click();
    
    // Auto-advance step to Program Selection via Continue button
    await page.getByRole('button', { name: 'Continue' }).click();

    // ------------------------------------------------------------
    // 5. Step 4: Program Selection
    // ------------------------------------------------------------
    // Select Computer Science and Academic Term
    await page.locator('select').first().selectOption({ label: 'BS Computer Science (College of Computing)' });
    await page.locator('select').nth(1).selectOption('1st Semester 2026-2027');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Should now be on step 5 (Course Evaluation) - showing 'Evaluation Pending'
    await expect(page.locator('text=Evaluation Pending')).toBeVisible();

    // Exit portal and go back to gateway
    await page.getByRole('button', { name: 'Exit Portal' }).click();
    await page.getByRole('button', { name: 'Back to Gateway' }).click();

    // ------------------------------------------------------------
    // 6. Admissions Department - Document Review & Clearance
    // ------------------------------------------------------------
    await page.getByRole('button').filter({ hasText: 'Staff Portal' }).click();
    await page.locator('input[type="email"]').fill('admission@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Select the student in the list
    await page.locator(`text=${studentId}`).first().click();
    await page.locator('textarea').fill('TOR and Good Moral files are verified.');
    await page.getByRole('button', { name: 'Approve Application' }).click();

    // Confirm the action using our custom modal
    await page.locator('button:has-text("Approve Documents")').last().click();

    // Wait for the student to be removed from the admissions sidebar queue (confirms DB save)
    await page.locator(`.flex-1.overflow-y-auto >> text=${studentId}`).first().waitFor({ state: 'detached' });

    // Log out of Staff Portal
    await page.locator('text=Sign Out').click();
    await page.locator('text=Back to Gateway').click();

    // ------------------------------------------------------------
    // 7. Adviser Department - Academic Advisory & Subject Clearance
    // ------------------------------------------------------------
    await page.getByRole('button').filter({ hasText: 'Staff Portal' }).click();
    await page.locator('input[type="email"]').fill('adviser@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Select the student in the queue
    await page.locator(`text=${studentId}`).first().click();
    await page.locator('textarea').fill('All prerequisites verified. Selected standard first term subjects.');
    await page.getByRole('button', { name: 'Approve Eligibility' }).click();

    // Confirm using custom modal
    await page.locator('button:has-text("Approve Advising")').last().click();

    // Wait for the student to be removed from the adviser sidebar queue (confirms DB save)
    await page.locator(`.flex-1.overflow-y-auto >> text=${studentId}`).first().waitFor({ state: 'detached' });

    await page.locator('text=Sign Out').click();
    await page.locator('text=Back to Gateway').click();

    // ------------------------------------------------------------
    // 8. Student Portal - Subject Enrollment & Payment Simulation
    // ------------------------------------------------------------
    await page.getByRole('button').filter({ hasText: 'Student Portal' }).click();
    await page.getByRole('button', { name: 'Resume Application' }).click();
    await page.locator('input[placeholder*="STU-2026-0001"]').fill(studentId);
    await page.getByRole('button', { name: 'Continue Enrollment' }).click();

    // Since advising is approved, the portal resumes directly on step 6 (Subject Enrollment)
    await expect(page.locator('text=Subject Enrollment Matrix')).toBeVisible();

    // Select the first available subject.
    await page.locator('button:has-text("Add Subject")').first().click();

    // Click "Proceed to Payment" to advance to Step 7
    await page.getByRole('button', { name: 'Proceed to Payment' }).click();

    // Now on step 7 (Payment)
    await expect(page.locator('text=Tuition Assessment & Payment Portal')).toBeVisible();
    await page.locator('text=Card').click();
    await page.getByRole('button', { name: 'Proceed with Payment' }).click();

    // Fill in secure payment details in the validation modal
    await page.locator('input[placeholder="Cardholder Name"]').fill('Jeremiah Atayde');
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
    await page.getByRole('button', { name: 'Exit Portal' }).click();
    await page.getByRole('button', { name: 'Back to Gateway' }).click();

    // ------------------------------------------------------------
    // 9. Accounting Department - Payment Clearance
    // ------------------------------------------------------------
    await page.getByRole('button').filter({ hasText: 'Staff Portal' }).click();
    await page.locator('input[type="email"]').fill('accounting@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Find the row matching the student and click "Confirm Payment"
    const confirmPaymentBtn = page.locator(`tr:has-text("${studentId}") button:has-text("Confirm Payment")`);
    await confirmPaymentBtn.click();

    // Confirm using custom modal
    await page.locator('button:has-text("Confirm Payment")').last().click();

    // Wait for the confirm button to disappear from the row (confirms DB save)
    await confirmPaymentBtn.waitFor({ state: 'detached' });

    await page.locator('text=Sign Out').click();
    await page.locator('text=Back to Gateway').click();

    // ------------------------------------------------------------
    // 10. Registrar Department - Final Validation & Certification
    // ------------------------------------------------------------
    await page.getByRole('button').filter({ hasText: 'Staff Portal' }).click();
    await page.locator('input[type="email"]').fill('registrar@example.com');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Select the student
    await page.locator(`text=${studentId}`).first().click();
    await page.getByRole('button', { name: 'Validate & Finalize Enrollment' }).click();
    
    // Confirm using Registrar's inline prompt
    await page.getByRole('button', { name: 'Confirm & Finalize' }).click();

    // Wait for the success flash toast (confirms DB save)
    await page.locator('text=Enrollment validated for').waitFor({ state: 'visible' });

    await page.locator('text=Sign Out').click();
    await page.locator('text=Back to Gateway').click();

    // ------------------------------------------------------------
    // 11. Student Portal - Official Enrollment Verified
    // ------------------------------------------------------------
    await page.getByRole('button').filter({ hasText: 'Student Portal' }).click();
    await page.getByRole('button', { name: 'Resume Application' }).click();
    await page.locator('input[placeholder*="STU-2026-0001"]').fill(studentId);
    await page.getByRole('button', { name: 'Continue Enrollment' }).click();

    // Verify final screen displays COR generated download buttons and Enrolled banner
    await expect(page.locator('text=Enrollment Complete')).toBeVisible();
    await expect(page.locator('text=Certificate of Registration')).toBeVisible();
  });
});
