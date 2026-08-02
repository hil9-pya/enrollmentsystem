import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error('SMTP is not configured. Add SMTP_USER and SMTP_PASS to server/.env.');
  }

  const port = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
  });
  return transporter;
}

function sender() {
  return process.env.SMTP_FROM || `NCST Admissions <${process.env.SMTP_USER}>`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function sendVerificationOtpEmail({ to, firstName, otp }) {
  return getTransporter().sendMail({
    from: sender(),
    to,
    subject: 'Verify your NCST applicant email',
    text: `Your NCST verification code is ${otp}. It expires in 10 minutes. Do not share this code.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172554">
      <h2>Verify your email</h2><p>Hello ${escapeHtml(firstName || 'Applicant')},</p>
      <p>Use this code to continue your NCST application:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">${otp}</p>
      <p>This code expires in 10 minutes. Do not share it with anyone.</p></div>`,
  });
}

export async function sendApplicationSubmittedEmail(student) {
  return getTransporter().sendMail({
    from: sender(),
    to: student.email,
    subject: `NCST application received (${student._id})`,
    text: `Hello ${student.firstName}, your application ${student._id} and documents were submitted successfully. Admissions will email you after review.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172554">
      <h2>Application received</h2><p>Hello ${escapeHtml(student.firstName)},</p>
      <p>Your application and documents were submitted successfully.</p>
      <p><strong>Application ID:</strong> ${escapeHtml(student._id)}</p>
      <p>Admissions will email you after review.</p></div>`,
  });
}

export async function sendAdmissionApprovedEmail(student) {
  return getTransporter().sendMail({
    from: sender(),
    to: student.email,
    subject: `NCST application approved (${student._id})`,
    text: `Congratulations ${student.firstName}. Your application was approved. Your assigned school email is ${student.schoolEmail}. This school mailbox is simulated for this project. Sign in to the applicant portal for next steps.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172554">
      <h2>Application approved</h2><p>Congratulations ${escapeHtml(student.firstName)}!</p>
      <p>Your NCST application was approved.</p>
      <p><strong>Application ID:</strong> ${escapeHtml(student._id)}</p>
      <p><strong>Assigned school email:</strong> ${escapeHtml(student.schoolEmail)}</p>
      <p>Please sign in to the applicant portal for your next enrollment steps.</p>
      <p style="font-size:12px;color:#64748b">For this project demo, the assigned school mailbox is simulated.</p></div>`,
  });
}

export async function sendAdmissionRejectedEmail(student) {
  const notes = student.admissionNotes || 'Please review your uploaded documents and submit the required corrections.';
  return getTransporter().sendMail({
    from: sender(),
    to: student.email,
    subject: `Action required for NCST application (${student._id})`,
    text: `Hello ${student.firstName}. Your NCST application needs document corrections. Admissions note: ${notes} Sign in to the applicant portal to update and resubmit your documents.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172554">
      <h2>Application needs your attention</h2><p>Hello ${escapeHtml(student.firstName)},</p>
      <p>Admissions reviewed your application and requested document corrections.</p>
      <p><strong>Admissions note:</strong> ${escapeHtml(notes)}</p>
      <p>Sign in to the applicant portal to update and resubmit your documents.</p></div>`,
  });
}
