import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import crypto from 'crypto';
import Student from './Student.js';
import User from './User.js';
import Settings from './Settings.js';
import { computeTuition, SUBJECTS_CATALOG } from './subjectsCatalog.js';
import { getRequiredOnlineDocumentIds } from './documentRequirements.js';
import { ensureReceiptNumber, markPaymentReceived } from './paymentReceipt.js';
import { syncOfficialEnrollment } from './services/academicFoundationService.js';
import { getResolvedEnrolledSchedule } from './services/schedulerService.js';
import { generateApplicantToken } from './studentAccessMiddleware.js';
import { runWithOptionalTransaction } from './services/transactionService.js';
import AcademicTerm from './models/AcademicTerm.js';
import CourseMembership from './models/CourseMembership.js';
import {
  sendVerificationOtpEmail,
} from './services/emailService.js';
import { enqueueBackgroundJob } from './services/backgroundJobService.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DOWNPAYMENT_AMOUNT = 3000;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function hashEmailOtp(studentId, otp) {
  const secret = process.env.EMAIL_OTP_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('EMAIL_OTP_SECRET or JWT_SECRET must be configured.');
  return crypto.createHmac('sha256', secret).update(`${studentId}:${otp}`).digest('hex');
}

function getPaymentAmounts(student, paymentPlan) {
  const total = Math.max(0, Number(student.totalTuition) || 0);
  const plan = paymentPlan === 'downpayment' && total > DOWNPAYMENT_AMOUNT
    ? 'downpayment'
    : 'full';
  const amountPaid = plan === 'downpayment' ? DOWNPAYMENT_AMOUNT : total;
  return { plan, amountPaid, remainingBalance: Math.max(0, total - amountPaid) };
}

// Generates the next sequential id for a given prefix (e.g. STU-YYYY- or APP-YYYY-)
export async function generateNextId(prefixBase, session = null) {
  const year = new Date().getFullYear();
  const prefix = `${prefixBase}${year}-`;

  const existing = await Student.find({
    $or: [
      { _id: { $regex: `^${prefix}` } },
      { studentId: { $regex: `^${prefix}` } }
    ]
  }).select('_id studentId').session(session).lean();

  let maxSeq = 0;
  for (const doc of existing) {
    const idToCheck = doc.studentId?.startsWith(prefix) ? doc.studentId : doc._id;
    if (idToCheck && idToCheck.startsWith(prefix)) {
      const seq = parseInt(idToCheck.slice(prefix.length), 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }

  const existingUsers = await User.find({
    username: { $regex: `^${prefix}` }
  }).select('username').session(session).lean();

  for (const doc of existingUsers) {
    if (doc.username && doc.username.startsWith(prefix)) {
      const seq = parseInt(doc.username.slice(prefix.length), 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}

async function findStudentOr404(res, id) {
  const student = await Student.findOne({
    $or: [
      { _id: id },
      { studentId: id }
    ]
  });
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return null;
  }
  return student;
}

// @desc    List submitted applications and enrolled students (not deleted)
// @route   GET /api/students
const getStudents = asyncHandler(async (req, res) => {
  // Registration records are applicant-only drafts. Staff should only receive
  // applications after the applicant submits their documents for review.
  const students = await Student.find({
    isDeleted: { $ne: true },
    status: { $ne: 'registration' },
  }).sort({ _id: 1 });
  res.json(students);
});

// @desc    List all deleted students
// @route   GET /api/admin/students/deleted
const getDeletedStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({ isDeleted: true }).sort({ _id: 1 });
  res.json(students);
});

// @desc    Soft delete a student
// @route   DELETE /api/admin/students/:id
const softDeleteStudent = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;
  student.isDeleted = true;
  await student.save();
  res.json({ message: 'Student moved to trash', id: student._id });
});

// @desc    Restore a soft-deleted student
// @route   POST /api/admin/students/:id/restore
const restoreStudent = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;
  student.isDeleted = false;
  await student.save();
  res.json({ message: 'Student restored', id: student._id });
});

// @desc    Permanently delete a student
// @route   DELETE /api/admin/students/:id/permanent
const permanentlyDeleteStudent = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;
  
  await Student.deleteOne({ _id: student._id });
  res.json({ message: 'Student permanently deleted', id: student._id });
});

// @desc    Get a single student
// @route   GET /api/students/:id
const getStudentById = asyncHandler(async (req, res) => {
  const idOrEmail = req.params.id;
  let student = null;
  
  if (idOrEmail.includes('@')) {
    student = await Student.findOne({ email: idOrEmail.toLowerCase().trim() });
  } else {
    student = await Student.findOne({
      $or: [
        { _id: idOrEmail },
        { studentId: idOrEmail }
      ]
    });
    if (!student) {
      student = await Student.findOne({ email: idOrEmail.toLowerCase().trim() });
    }
  }

  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }
  res.json(student);
});

// @desc    Generate a blank draft applicant with a unique ID
// @route   POST /api/students/draft
const createDraft = asyncHandler(async (req, res) => {
  const id = await generateNextId('APP-');
  const student = await Student.create({
    _id: id,
    status: 'registration',
  });
  res.status(201).json({ ...student.toJSON(), accessToken: generateApplicantToken(student._id) });
});

// @desc    Applicant Gateway login
// @route   POST /api/students/applicant-login
const applicantLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const student = await Student.findOne({ email: normalizedEmail });

  if (!student) {
    res.status(401);
    throw new Error('Application not found');
  }

  const isMatch = await student.compareApplicantPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.json({ ...student.toJSON(), accessToken: generateApplicantToken(student._id) });
});

// @desc    Check whether an applicant email can be used
// @route   GET /api/students/email-availability
const checkEmailAvailability = asyncHandler(async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const excludeStudentId = String(req.query.excludeStudentId || '').trim();

  if (!email) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }

  const existing = await Student.findOne({ email }).select('_id');
  res.json({ available: !existing || String(existing._id) === excludeStudentId });
});

// @desc    Start a new student application (Student Portal "New Application")
// @route   POST /api/students/register
const registerStudent = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone } = req.body;

  if (!firstName || !lastName || !email || !phone) {
    res.status(400);
    throw new Error('firstName, lastName, email, and phone are all required.');
  }

  if (/[^a-zA-Z\s]/.test(firstName)) {
    res.status(400).json({ error: 'First name must contain letters and spaces only.' });
    return;
  }
  if (/[^a-zA-Z\s]/.test(lastName)) {
    res.status(400).json({ error: 'Last name must contain letters and spaces only.' });
    return;
  }
  if (/[^0-9-\s]/.test(phone)) {
    res.status(400).json({ error: 'Contact number must contain digits, hyphens, and spaces only.' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await Student.findOne({ email: normalizedEmail });
  if (existing) {
    res.status(400).json({ error: 'An application with this email already exists.' });
    return;
  }

  const id = await generateNextId('APP-');


  const student = await Student.create({
    _id: id,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    status: 'registration',
  });

  // FAST-TRACK logic: continuing students do not need document review
  if (req.body.enrollmentType === 'continuing') {
    student.enrollmentType = req.body.enrollmentType;
    student.status = 'advising_pending';
    await student.save();
  } else if (req.body.enrollmentType) {
    student.enrollmentType = req.body.enrollmentType;
    await student.save();
  }

  res.status(201).json({ ...student.toJSON(), accessToken: generateApplicantToken(student._id) });
});

// @desc    Send email ownership verification OTP
// @route   POST /api/students/:id/email-verification/send
const sendEmailVerificationOtp = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  const normalizedEmail = String(req.body.email || student.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400);
    throw new Error('Enter a valid email address before requesting a verification code.');
  }

  const duplicate = await Student.exists({ _id: { $ne: student._id }, email: normalizedEmail });
  if (duplicate) {
    res.status(400);
    throw new Error('An application with this email already exists.');
  }
  if (student.emailVerified && student.email === normalizedEmail) {
    res.json({ message: 'Email is already verified.', emailVerified: true });
    return;
  }

  const now = Date.now();
  if (student.emailOtpLastSentAt && now - new Date(student.emailOtpLastSentAt).getTime() < OTP_RESEND_COOLDOWN_MS) {
    res.status(429);
    throw new Error('Please wait 60 seconds before requesting another code.');
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  student.email = normalizedEmail;
  student.emailVerified = false;
  student.emailOtpHash = hashEmailOtp(student._id, otp);
  student.emailOtpExpiresAt = new Date(now + OTP_TTL_MS);
  student.emailOtpLastSentAt = new Date(now);
  student.emailOtpAttempts = 0;
  await student.save();

  try {
    await sendVerificationOtpEmail({ to: student.email, firstName: student.firstName, otp });
  } catch (error) {
    student.emailOtpHash = null;
    student.emailOtpExpiresAt = null;
    student.emailOtpLastSentAt = null;
    await student.save();
    res.status(503);
    throw new Error(`Verification email could not be sent. ${error.message}`);
  }

  res.json({ message: 'Verification code sent.', emailVerified: false });
});

// @desc    Verify email ownership OTP
// @route   POST /api/students/:id/email-verification/verify
const verifyEmailOtp = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;
  if (student.emailVerified) {
    res.json({ message: 'Email is already verified.', emailVerified: true });
    return;
  }

  const otp = String(req.body.otp || '').trim();
  if (!/^\d{6}$/.test(otp)) {
    res.status(400);
    throw new Error('Enter the 6-digit verification code.');
  }
  if (!student.emailOtpHash || !student.emailOtpExpiresAt) {
    res.status(400);
    throw new Error('Request a verification code first.');
  }
  if (new Date(student.emailOtpExpiresAt).getTime() <= Date.now()) {
    student.emailOtpHash = null;
    student.emailOtpExpiresAt = null;
    await student.save();
    res.status(400);
    throw new Error('Verification code expired. Request a new code.');
  }
  if (student.emailOtpAttempts >= OTP_MAX_ATTEMPTS) {
    res.status(429);
    throw new Error('Too many incorrect attempts. Request a new code.');
  }

  const submittedHash = hashEmailOtp(student._id, otp);
  const matches = crypto.timingSafeEqual(Buffer.from(submittedHash, 'hex'), Buffer.from(student.emailOtpHash, 'hex'));
  if (!matches) {
    student.emailOtpAttempts += 1;
    await student.save();
    res.status(400);
    throw new Error('Incorrect verification code.');
  }

  student.emailVerified = true;
  student.emailOtpHash = null;
  student.emailOtpExpiresAt = null;
  student.emailOtpLastSentAt = null;
  student.emailOtpAttempts = 0;
  await student.save();
  res.json({ message: 'Email verified successfully.', emailVerified: true });
});

// @desc    Generic partial update (enrollment type, personal info, payment method, etc.)
// @route   PUT /api/students/:id
const updateStudent = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  const allowedFields = [
    'enrollmentType',
    'firstName',
    'lastName',
    'email',
    'phone',
    'birthDate',
    'address',
    'submitDocumentsOnCampus',
    'subjectChangeRequest',
    'applicantPassword',
    'paymentMethod',
    // Transferee-specific fields
    'previousSchool',
    'previousProgram',
    'yearLevelAtTransfer',
    'reasonForTransfer',
    'unitsEarned',
  ];
  if (req.user?.role === 'admin') allowedFields.push('status', 'paymentStatus');

  // Helper: strip characters used in NoSQL injection attacks ($ and leading dots)
  const sanitizeString = (val, maxLen = 300) => {
    if (typeof val !== 'string') return '';
    // Remove $ to prevent MongoDB operator injection, trim whitespace, cap length
    return val.replace(/[$]/g, '').trim().slice(0, maxLen);
  };

  // Validate enrollmentType is an allowed value
  const VALID_ENROLLMENT_TYPES = ['new', 'transfer', 'returning', 'continuing', 'cross_enrollee'];
  if (req.body.enrollmentType !== undefined && !VALID_ENROLLMENT_TYPES.includes(req.body.enrollmentType)) {
    res.status(400).json({ error: 'Invalid enrollment type.' });
    return;
  }

  if (req.body.firstName !== undefined) {
    const val = sanitizeString(String(req.body.firstName), 100);
    if (/[^a-zA-Z\s\-.]/.test(val)) {
      res.status(400).json({ error: 'First name must contain letters, spaces, hyphens, and dots only.' });
      return;
    }
    req.body.firstName = val;
  }
  if (req.body.lastName !== undefined) {
    const val = sanitizeString(String(req.body.lastName), 100);
    if (/[^a-zA-Z\s\-.]/.test(val)) {
      res.status(400).json({ error: 'Last name must contain letters, spaces, hyphens, and dots only.' });
      return;
    }
    req.body.lastName = val;
  }
  if (req.body.phone !== undefined) {
    const val = sanitizeString(String(req.body.phone), 20);
    if (/[^0-9-\s+]/.test(val)) {
      res.status(400).json({ error: 'Contact number must contain digits, hyphens, and spaces only.' });
      return;
    }
    req.body.phone = val;
  }
  if (req.body.email !== undefined) {
    const email = String(req.body.email).trim().toLowerCase();
    if (email !== student.email && student.status !== 'registration') {
      res.status(400).json({ error: 'Email cannot be changed after documents are submitted. Contact Admissions for assistance.' });
      return;
    }
    const existing = email ? await Student.findOne({ email }).select('_id') : null;
    if (existing && String(existing._id) !== String(student._id)) {
      res.status(400).json({ error: 'An application with this email already exists.' });
      return;
    }
    if (email !== student.email) {
      student.emailVerified = false;
      student.emailOtpHash = null;
      student.emailOtpExpiresAt = null;
      student.emailOtpLastSentAt = null;
      student.emailOtpAttempts = 0;
    }
    req.body.email = email;
  }
  if (req.body.address !== undefined) {
    // Preserve spaces while the registration form saves each keystroke.
    req.body.address = String(req.body.address).replace(/[$]/g, '').slice(0, 500);
  }
  // Validate and sanitize transferee fields
  if (req.body.previousSchool !== undefined) {
    req.body.previousSchool = sanitizeString(String(req.body.previousSchool), 200);
  }
  if (req.body.previousProgram !== undefined) {
    req.body.previousProgram = sanitizeString(String(req.body.previousProgram), 200);
  }
  if (req.body.reasonForTransfer !== undefined) {
    req.body.reasonForTransfer = sanitizeString(String(req.body.reasonForTransfer), 500);
  }
  if (req.body.unitsEarned !== undefined) {
    const val = String(req.body.unitsEarned).trim();
    if (!/^\d{0,3}$/.test(val)) {
      res.status(400).json({ error: 'Units earned must be a valid number (0-999).' });
      return;
    }
    req.body.unitsEarned = val;
  }
  const VALID_YEAR_LEVELS = ['1', '2', '3', '4', '5'];
  if (req.body.yearLevelAtTransfer !== undefined && req.body.yearLevelAtTransfer !== '' && !VALID_YEAR_LEVELS.includes(String(req.body.yearLevelAtTransfer))) {
    res.status(400).json({ error: 'Invalid year level at transfer.' });
    return;
  }
  if (req.body.applicantPassword !== undefined && req.body.applicantPassword) {
    const pwd = String(req.body.applicantPassword);
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(pwd);
    if (pwd.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    if (!hasUppercase || !hasNumber || !hasSpecialChar) {
      res.status(400).json({ error: 'Password must include at least one uppercase letter, one number, and one special character.' });
      return;
    }
  }

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      student[field] = req.body[field];
    }
  }

  await student.save();
  res.json(student);
});

// @desc    Submit uploaded documents for admission review
// @route   POST /api/students/:id/submit-documents
const submitDocuments = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  if (student.enrollmentType === 'continuing') {
    student.status = 'advising_pending';
  } else {
    if (!student.emailVerified) {
      res.status(400).json({ error: 'Verify your email before submitting documents.' });
      return;
    }
    if (!['registration', 'documents_rejected'].includes(student.status)) {
      res.status(400).json({ error: 'Application has already been submitted for review.' });
      return;
    }

    const requiredApplicantFields = [
      ['enrollmentType', student.enrollmentType],
      ['program', student.programId],
      ['first name', student.firstName?.trim()],
      ['last name', student.lastName?.trim()],
      ['email address', student.email?.trim()],
      ['phone number', student.phone?.trim()],
      ['birth date', student.birthDate],
      ['home address', student.address?.trim()],
      ['applicant password', student.applicantPassword],
    ];
    const missingField = requiredApplicantFields.find(([, value]) => !value);
    if (missingField) {
      res.status(400).json({ error: `Complete your ${missingField[0]} before submitting the application.` });
      return;
    }

    const requiredDocumentIds = getRequiredOnlineDocumentIds(
      student.enrollmentType,
      student.submitDocumentsOnCampus,
    );
    const uploadedDocumentIds = new Set(student.documents.map((document) => document.typeId));
    const missingDocuments = requiredDocumentIds.filter((documentId) => !uploadedDocumentIds.has(documentId));
    if (missingDocuments.length > 0) {
      res.status(400).json({ error: 'Upload all required documents before submitting the application.' });
      return;
    }

    student.status = 'documents_submitted';
  }
  student.admissionNotes = ''; // Clear notes on resubmission
  await student.save();
  if (student.emailVerified && student.email) {
    await enqueueBackgroundJob('application_submitted_email', student.toJSON(), {
      deduplicationKey: `application-submitted:${student._id}:${student.updatedAt.toISOString()}`,
    });
  }
  res.json(student);
});

// @desc    Upload (or replace) a single required document
// @route   POST /api/students/:id/documents  (multipart/form-data: typeId, file)
const uploadDocument = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  const { typeId } = req.body;
  if (!typeId) {
    res.status(400).json({ error: 'typeId is required.' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'No file was uploaded.' });
    return;
  }

  const docEntry = {
    typeId,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    uploadedAt: new Date(),
    status: 'pending',
  };

  const existingIndex = student.documents.findIndex((d) => d.typeId === typeId);
  if (existingIndex >= 0) {
    // Remove the previously uploaded file for this document type from disk.
    const previous = student.documents[existingIndex];
    const prevPath = path.join(UPLOADS_DIR, previous.fileName);
    fs.unlink(prevPath, () => {});
    student.documents[existingIndex] = docEntry;
  } else {
    student.documents.push(docEntry);
  }

  await student.save();
  res.json(student);
});

// @desc    Remove an uploaded document
// @route   DELETE /api/students/:id/documents/:typeId
const removeDocument = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  const { typeId } = req.params;
  const existing = student.documents.find((d) => d.typeId === typeId);
  if (existing) {
    fs.unlink(path.join(UPLOADS_DIR, existing.fileName), () => {});
  }

  student.documents = student.documents.filter((d) => d.typeId !== typeId);
  await student.save();
  res.json(student);
});

const getDocumentFile = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  const document = student.documents.find((item) => item.typeId === req.params.typeId);
  if (!document) {
    res.status(404);
    throw new Error('Document not found.');
  }

  const safeFileName = path.basename(document.fileName);
  if (safeFileName !== document.fileName) {
    res.status(400);
    throw new Error('Invalid document path.');
  }
  const filePath = path.join(UPLOADS_DIR, safeFileName);
  if (!fs.existsSync(filePath)) {
    res.status(404);
    throw new Error('Uploaded file is missing.');
  }

  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalName || safeFileName)}"`);
  res.sendFile(filePath);
});

// @desc    Select degree program & academic term
// @route   POST /api/students/:id/select-program
const selectProgram = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  const { programId, academicTerm } = req.body;

  // Program selected during applicant admission stays fixed in Student Portal.
  // Only term may change for a new enrollment cycle.
  const applicantStageStatuses = ['registration', 'documents_submitted', 'documents_rejected'];
  if (
    student.programId &&
    !applicantStageStatuses.includes(student.status) &&
    programId !== student.programId
  ) {
    res.status(400).json({ error: 'Degree program cannot be changed in Student Portal.' });
    return;
  }

  student.programId = programId;
  student.academicTerm = academicTerm;

  const prefix = programId === 'bscs' ? 'cs' : programId === 'bsba' ? 'ba' : 'nu';
  let eligibleSubjectIds = [];

  if (student.enrollmentType === 'new') {
    eligibleSubjectIds = SUBJECTS_CATALOG
      .filter(sub => sub.id.startsWith(prefix) && sub.yearLevel === 1)
      .map(sub => sub.id);
    student.yearLevel = 1;
  } else if (student.enrollmentType === 'continuing') {
    const completed = student.academicRecord
      ? student.academicRecord.filter(r => r.grade <= 3.0).map(r => r.subjectId)
      : [];
    eligibleSubjectIds = SUBJECTS_CATALOG
      .filter(sub => sub.id.startsWith(prefix))
      .filter(sub => !completed.includes(sub.id))
      .filter(sub => sub.prerequisites.every(prereq => completed.includes(prereq)))
      .map(sub => sub.id);
    
    if (eligibleSubjectIds.length > 0) {
      const maxYear = Math.max(...eligibleSubjectIds.map(id => {
        const sub = SUBJECTS_CATALOG.find(s => s.id === id);
        return sub ? sub.yearLevel : 1;
      }));
      student.yearLevel = maxYear;
    }
  } else {
    // Transfer or Returning: No auto-enrollment. Adviser must evaluate.
    eligibleSubjectIds = [];
  }

  // Adviser-approved subjects and student-selected class sections are
  // different records. Never invent a section ID before the student chooses.
  student.approvedSubjectIds = eligibleSubjectIds;
  student.selectedSubjects = [];

  const { tuitionBreakdown, totalTuition } = computeTuition([]);
  student.tuitionBreakdown = tuitionBreakdown;
  student.totalTuition = totalTuition;

  // Regular freshmen follow the prescribed first-year curriculum and do not
  // need individual adviser approval. Other enrollment types still require
  // academic evaluation before section selection.
  if (student.status === 'documents_approved') {
    student.status = student.enrollmentType === 'new'
      ? 'advising_approved'
      : 'advising_pending';
  }

  await student.save();
  res.json(student);
});

// @desc    Set the student's selected subjects (used by the student's own
//          add/remove flow, and by the adviser's "edit subjects" modal)
// @route   POST /api/students/:id/subjects   body: { subjectIds: string[] }
const setSubjects = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  const inputSubjects = Array.isArray(req.body.subjects) ? req.body.subjects : [];
  const subjectIds = inputSubjects.length > 0 
    ? inputSubjects.map(s => s.subjectId)
    : (Array.isArray(req.body.subjectIds) ? req.body.subjectIds : []);

  if (['advising_approved', 'payment_pending', 'validation_pending', 'enrolled'].includes(student.status)) {
    res.status(400);
    throw new Error('Cannot modify subjects after advising approval.');
  }

  if (req.body.academicRecord !== undefined) {
    student.academicRecord = Array.isArray(req.body.academicRecord) ? req.body.academicRecord : [];
  }
  if (req.body.yearLevel !== undefined) {
    student.yearLevel = Number(req.body.yearLevel);
  }

  // Prerequisite validation
  const passedSubjectIds = student.academicRecord
    ? student.academicRecord.filter(r => r.grade <= 3.0).map(r => r.subjectId)
    : [];

  for (const subjectId of subjectIds) {
    const sub = SUBJECTS_CATALOG.find(s => s.id === subjectId);
    if (sub && sub.prerequisites && sub.prerequisites.length > 0) {
      const hasAllPrereqs = sub.prerequisites.every(prereq => passedSubjectIds.includes(prereq));
      if (!hasAllPrereqs) {
        res.status(400);
        throw new Error(`Prerequisites not met for ${sub.name}. Requires: ${sub.prerequisites.join(', ')}`);
      }
    }
  }

  const hasExplicitSections = inputSubjects.length > 0
    && inputSubjects.every((subject) => subject.subjectId && subject.sectionId);

  if (hasExplicitSections) {
    student.selectedSubjects = inputSubjects.map(({ subjectId, sectionId }) => ({
      subjectId,
      sectionId,
      addedAt: new Date(),
    }));
  } else {
    // Adviser assigns eligible subjects, but student chooses actual sections.
    student.approvedSubjectIds = subjectIds;
    student.selectedSubjects = (student.selectedSubjects || []).filter(
      (selection) => subjectIds.includes(selection.subjectId)
        && selection.sectionId
        && selection.sectionId !== `${selection.subjectId}-a`
    );
  }
  student.scheduleStatus = 'draft';

  const selectedSubjectIds = student.selectedSubjects.map((selection) => selection.subjectId);
  const { tuitionBreakdown, totalTuition } = computeTuition(selectedSubjectIds);
  student.tuitionBreakdown = tuitionBreakdown;
  student.totalTuition = totalTuition;

  // Removed auto-advance status logic. The student portal will explicitly
  // request payment_pending status transition on clicking Proceed to Payment.
  // if (subjectIds.length > 0 && ['advising_approved', 'enrollment_pending'].includes(previousStatus)) {
  //   student.status = 'payment_pending';
  // } else if (subjectIds.length === 0 && previousStatus === 'payment_pending') {
  //   student.status = 'advising_approved';
  // }

  // Clear any pending subject change requests since staff has actioned it
  student.subjectChangeRequest = '';

  await student.save();
  res.json(student);
});

// @desc    Simulate processing a tuition payment
// @route   POST /api/students/:id/payment   body: { paymentMethod, success }
const processPayment = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  const { paymentMethod, success, paymentDetails, paymentReference, paymentPlan } = req.body;
  const amounts = getPaymentAmounts(student, paymentPlan);
  if (paymentMethod) student.paymentMethod = paymentMethod;
  if (paymentDetails) student.paymentDetails = { ...paymentDetails, amount: amounts.amountPaid };
  if (paymentReference) student.paymentReference = paymentReference;
  student.paymentPlan = amounts.plan;
  student.amountPaid = amounts.amountPaid;
  student.remainingBalance = amounts.remainingBalance;
  student.paymentStatus = success ? 'processing' : 'failed';

  await student.save();
  res.json(student);
});

// @desc    Admission: approve submitted documents
// @route   POST /api/students/:id/approve-admission   body: { notes }
const approveAdmission = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  if (student.status !== 'documents_submitted') {
    res.status(400);
    throw new Error('Invalid action: Applicant is not in a pending review state.');
  }

  student.admissionNotes = req.body.notes || '';
  student.documents.forEach((document) => {
    document.status = 'approved';
  });
  
  if (!student.schoolEmail) {
    const safeFirst = student.firstName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const safeLast = student.lastName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    let emailBase = `${safeFirst}.${safeLast}@ncst.edu`;
    
    // Ensure unique email
    let emailIdx = 1;
    let finalEmail = emailBase;
    while (await User.findOne({ email: finalEmail })) {
      finalEmail = `${safeFirst}.${safeLast}${emailIdx}@ncst.edu`;
      emailIdx++;
    }
    student.schoolEmail = finalEmail;
    
    // Create user account using their APP- ID (student._id) as username
    // They will log in using this APP- ID until they pay.
    await User.create({
      username: student._id,
      email: finalEmail,
      password: 'NCST2026!', // Default password for demo
      firstName: student.firstName,
      lastName: student.lastName,
      role: 'student',
      studentProfile: student._id,
    });
  }

  if (student.programId) {
    student.status = student.enrollmentType === 'new'
      ? 'advising_approved'
      : 'advising_pending';
  } else {
    student.status = 'documents_approved';
  }

  student.auditLogs.push({
    action: 'Approved Documents',
    user: req.user ? req.user.username : 'Admissions Officer',
    date: new Date()
  });

  if (student.status === 'advising_approved' && student.enrollmentType === 'new') {
    student.auditLogs.push({
      action: 'Automatically Cleared Prescribed Freshman Curriculum',
      user: 'Enrollment System',
      date: new Date()
    });
  }

  await student.save();
  if (student.emailVerified && student.email) {
    await enqueueBackgroundJob('admission_approved_email', student.toJSON(), {
      deduplicationKey: `admission-approved:${student._id}`,
    });
  }
  res.json(student);
});


// @desc    Admission: reject submitted documents, ask for resubmission
// @route   POST /api/students/:id/reject-admission   body: { notes }
const rejectAdmission = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  if (student.status !== 'documents_submitted') {
    res.status(400);
    throw new Error('Invalid action: Applicant is not in a pending review state.');
  }

  student.admissionNotes = req.body.notes || '';
  student.status = 'documents_rejected';

  student.auditLogs.push({
    action: 'Rejected Documents',
    user: req.user ? req.user.username : 'Admissions Officer',
    date: new Date()
  });

  await student.save();
  if (student.emailVerified && student.email) {
    await enqueueBackgroundJob('admission_rejected_email', student.toJSON(), {
      deduplicationKey: `admission-rejected:${student._id}:${student.updatedAt.toISOString()}`,
    });
  }
  res.json(student);
});

// @desc    Adviser: reject academic evaluation / eligibility
// @route   POST /api/students/:id/reject-advising   body: { notes }
const rejectAdvising = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  student.adviserNotes = req.body.notes || '';
  student.status = 'advising_rejected';
  student.subjectChangeRequest = '';

  await student.save();
  res.json(student);
});

const approveAdvising = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  student.adviserNotes = req.body.notes || '';
  student.status = 'advising_approved';
  student.subjectChangeRequest = '';

  await student.save();
  res.json(student);
});

// @desc    Accounting: confirm a payment has been received
// @route   POST /api/students/:id/confirm-payment
const confirmPayment = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  if (student.status !== 'payment_pending') {
    res.status(400);
    throw new Error('Invalid action: Student is not pending payment.');
  }

  const amounts = getPaymentAmounts(student, student.paymentPlan);
  student.amountPaid = amounts.amountPaid;
  student.remainingBalance = amounts.remainingBalance;
  student.paymentStatus = amounts.remainingBalance > 0 ? 'partial' : 'paid';
  if (student.status === 'payment_pending') {
    student.status = 'payment_confirmed';
  }
  markPaymentReceived(student);

  await student.save();
  res.json(student);
});

// @desc    Proceed to Payment
// @route   POST /api/students/:id/proceed-to-payment
const proceedToPayment = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  if (student.status !== 'advising_approved') {
    res.status(400);
    throw new Error('Not cleared for payment. Must be advising_approved.');
  }

  student.status = 'payment_pending';
  await student.save();
  res.json(student);
});

// @desc    Registrar: final validation, officially enrolls the student
// @route   POST /api/students/:id/validate-enrollment
const validateEnrollment = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  if (student.status !== 'payment_confirmed' && student.status !== 'enrolled') {
    res.status(400);
    throw new Error('Invalid action: Student must be payment_confirmed or already enrolled.');
  }

  if (!student.selectedSubjects || student.selectedSubjects.length === 0) {
    res.status(400);
    throw new Error('Invalid action: Student has no finalized class schedule.');
  }
  const resolvedSchedule = await getResolvedEnrolledSchedule(student.selectedSubjects);
  if (resolvedSchedule.length !== student.selectedSubjects.length) {
    res.status(409);
    throw new Error('Invalid action: One or more selected sections no longer exist. Resolve the schedule first.');
  }

  const enrolledStudent = await runWithOptionalTransaction(async (session) => {
    const current = await Student.findById(student._id).session(session);
    if (!current) throw new Error('Student not found.');
    if (!['payment_confirmed', 'enrolled'].includes(current.status)) {
      const error = new Error('Student status changed before validation. Refresh and try again.');
      error.statusCode = 409;
      throw error;
    }

    const settings = await Settings.findOne().session(session);
    const activeTerm = settings?.activeTerm || '1st Semester 2026-2027';
    const account = await User.findOne({
      role: 'student',
      $or: [
        { studentProfile: current._id },
        { username: { $in: [current.studentId, current._id].filter(Boolean) } },
      ],
    }).session(session);

    if (!current.studentId) current.studentId = await generateNextId('STU-', session);
    current.enrolledAt = current.enrolledAt || new Date();
    current.scheduleGenerated = true;
    current.scheduleStatus = 'finalized';
    current.registrationFormGenerated = true;
    current.receiptGenerated = true;
    current.missedSemesters = 0;
    current.lastEnrolledTerm = activeTerm;
    ensureReceiptNumber(current);

    await syncOfficialEnrollment(current, activeTerm, {
      actor: req.user,
      session,
      studentUserId: account?._id || null,
    });
    if (account && account.username !== current.studentId) {
      account.username = current.studentId;
    }
    if (account && account.studentProfile !== current._id) account.studentProfile = current._id;
    if (account?.isModified()) await account.save({ session });
    current.status = 'enrolled';
    await current.save({ session });
    return current;
  });

  res.json(enrolledStudent);
});

// @desc    Admin: Resolve a student's hold
// @route   POST /api/admin/students/:id/resolve-hold
const resolveHold = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  const { type, notes: _notes } = req.body;
  const holdIndex = student.holds.findIndex(h => h.type === type && h.status === 'active');
  
  if (holdIndex >= 0) {
    student.holds[holdIndex].status = 'resolved';
    student.holds[holdIndex].resolvedAt = new Date();
    
    // Also mark associated document as approved if exists
    let docType = '';
    if (type === 'readmission') docType = 'readmission_clearance';
    if (docType) {
      const doc = student.documents.find(d => d.typeId === docType && d.status === 'pending');
      if (doc) doc.status = 'approved';
    }

    student.auditLogs.push({
      action: `Resolved ${type} Hold`,
      user: req.user ? req.user.username : 'System Admin',
      date: new Date()
    });

    await student.save();
  }

  res.json(student);
});

// @desc    Admin: Flag student as AWOL/Returning
// @route   POST /api/admin/students/:id/set-returning
const setReturning = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  student.enrollmentType = 'returning';
  student.status = 'registration'; // Kick them back to the start
  
  // Add readmission hold if not already there
  const hasHold = student.holds.some(h => h.type === 'readmission' && h.status === 'active');
  if (!hasHold) {
    student.holds.push({
      type: 'readmission',
      status: 'active',
      description: 'AWOL from previous semester. Please upload Readmission Clearance form from the Dean.',
      createdAt: new Date(),
    });
  }

  student.auditLogs.push({
    action: `Flagged as Returning (AWOL)`,
    user: req.user ? req.user.username : 'System Admin',
    date: new Date()
  });

  await student.save();
  res.json(student);
});

// @desc    Rollover an enrolled student to the next semester (Continuing)
// @route   POST /api/students/:id/rollover
const rolloverStudent = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  if (student.status !== 'enrolled') {
    res.status(400);
    throw new Error('Only fully enrolled students can be rolled over to the next semester.');
  }

  const settings = await Settings.findOne();
  if (!settings?.activeTerm || settings.activeTerm === student.academicTerm) {
    res.status(409);
    throw new Error('A new academic term must be activated before re-enrollment.');
  }

  const previousTerm = await AcademicTerm.findOne({ name: student.academicTerm });
  if (previousTerm) {
    const unfinishedMembership = await CourseMembership.exists({
      student: student._id,
      term: previousTerm._id,
      status: 'enrolled',
    });
    if (unfinishedMembership) {
      res.status(409);
      throw new Error('Previous-term classes must have published final grades or recorded drop/withdrawal statuses before re-enrollment.');
    }
  }

  // Reset enrollment state
  student.selectedSubjects = [];
  student.scheduleStatus = 'draft';
  student.tuitionBreakdown = [];
  student.totalTuition = 0;
  student.academicTerm = settings.activeTerm;
  student.scheduleGenerated = false;
  student.registrationFormGenerated = false;
  student.receiptGenerated = false;
  
  // Transition status
  student.status = 'advising_pending';
  student.enrollmentType = 'continuing';

  student.auditLogs.push({
    action: `Rolled over to Continuing Student`,
    user: req.user ? req.user.username : 'System Admin',
    date: new Date()
  });

  await student.save();
  res.json(student);
});

// @desc    Initiate Paymongo Checkout Session for online tuition payment
// @route   POST /api/students/:id/paymongo-checkout
const createPaymongoCheckoutSession = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  if (student.status !== 'advising_approved' && student.status !== 'payment_pending') {
    res.status(400);
    throw new Error('Not cleared for payment. Student must be cleared by academic adviser.');
  }

  // Calculate amount in centavos (PHP amount * 100)
  const amounts = getPaymentAmounts(student, req.body.paymentPlan);
  student.paymentPlan = amounts.plan;
  student.amountPaid = amounts.amountPaid;
  student.remainingBalance = amounts.remainingBalance;
  await student.save();
  const amountInCentavos = Math.round(amounts.amountPaid * 100);
  const port = process.env.PORT || 5000;
  const paymongoBaseUrl = `http://127.0.0.1:${port}/api/paymongo/v1/checkout_sessions`;

  try {
    // Send post request to our simulated Paymongo Checkout Session API
    const response = await axios.post(paymongoBaseUrl, {
      data: {
        attributes: {
          billing: {
            name: `${student.firstName} ${student.lastName}`,
            email: student.email,
            phone: student.phone
          },
          line_items: [
            {
              amount: amountInCentavos,
              currency: 'PHP',
              name: amounts.plan === 'downpayment'
                ? 'NCST Enrollment Downpayment'
                : 'NCST Enrollment Tuition & Fees Assessment',
              quantity: 1
            }
          ],
          payment_method_types: ['gcash', 'card', 'paymaya'],
          reference_number: student._id.toString(), // Pass student _id as reference number
          success_url: `http://localhost:5173/?portal=payment-success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `http://localhost:5173/?portal=student`
        }
      }
    }, {
      headers: { Authorization: req.headers.authorization },
    });

    res.status(200).json(response.data.data.attributes);
  } catch (error) {
    console.error('Error initiating Paymongo checkout session:', error.response?.data || error.message);
    res.status(500);
    throw new Error('Failed to initiate online payment checkout.');
  }
});

// @desc    Verify Paymongo Payment completion
// @route   GET /api/students/:id/verify-paymongo-payment
const verifyPaymongoPayment = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  const { session_id } = req.query;
  if (!session_id) {
    res.status(400);
    throw new Error('session_id query parameter is required');
  }

  try {
    // Check the student's paymentDetails directly instead of making an HTTP self-call.
    const details = student.paymentDetails;
    
    if (!details || details.checkoutSessionId !== session_id) {
      res.status(400);
      throw new Error('Checkout session mismatch or not found on student record.');
    }

    if (details.status === 'paid') {
      return res.status(200).json(student);
    } else {
      res.status(400);
      throw new Error(`Payment is not completed. Checkout status is: ${details.status}`);
    }
  } catch (error) {
    console.error('Error verifying Paymongo payment:', error.message);
    res.status(error.statusCode || 500);
    throw new Error(error.message || 'Failed to verify payment status.');
  }
});

export {
  createDraft,
  createPaymongoCheckoutSession,
  verifyPaymongoPayment,
  applicantLogin,
  checkEmailAvailability,
  getStudents,
  getStudentById,
  registerStudent,
  sendEmailVerificationOtp,
  verifyEmailOtp,
  updateStudent,
  submitDocuments,
  uploadDocument,
  removeDocument,
  getDocumentFile,
  selectProgram,
  setSubjects,
  processPayment,
  approveAdmission,
  rejectAdmission,
  approveAdvising,
  confirmPayment,
  validateEnrollment,
  proceedToPayment,
  rejectAdvising,
  resolveHold,
  setReturning,
  rolloverStudent,
  getDeletedStudents,
  softDeleteStudent,
  restoreStudent,
  permanentlyDeleteStudent,
};
