import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Student from './Student.js';
import User from './User.js';
import { computeTuition, SUBJECTS_CATALOG } from './subjectsCatalog.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Generates the next sequential id for a given prefix (e.g. STU-YYYY- or APP-YYYY-)
async function generateNextId(prefixBase) {
  const year = new Date().getFullYear();
  const prefix = `${prefixBase}${year}-`;

  const existing = await Student.find({
    $or: [
      { _id: { $regex: `^${prefix}` } },
      { studentId: { $regex: `^${prefix}` } }
    ]
  }).select('_id studentId').lean();

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
  }).select('username').lean();

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

// @desc    List all students
// @route   GET /api/students
const getStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({}).sort({ _id: 1 });
  res.json(students);
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
  res.status(201).json(student);
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

  res.json(student);
});

// @desc    Start a new student application (Student Portal "New Application")
// @route   POST /api/students/register
const registerStudent = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone } = req.body;

  if (!firstName || !lastName || !email || !phone) {
    res.status(400);
    throw new Error('firstName, lastName, email, and phone are all required.');
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

  res.status(201).json(student);
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
  ];

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
    student.status = 'documents_submitted';
  }
  student.admissionNotes = ''; // Clear notes on resubmission
  await student.save();
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

// @desc    Select degree program & academic term
// @route   POST /api/students/:id/select-program
const selectProgram = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  const { programId, academicTerm } = req.body;
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
    const completed = student.completedSubjects || [];
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

  student.selectedSubjects = eligibleSubjectIds.map((subjectId) => ({
    subjectId,
    addedAt: new Date(),
  }));

  const { tuitionBreakdown, totalTuition } = computeTuition(eligibleSubjectIds);
  student.tuitionBreakdown = tuitionBreakdown;
  student.totalTuition = totalTuition;

  // Once the admission office has approved documents and the student has
  // now picked a program, the application enters the adviser's queue.
  if (student.status === 'documents_approved') {
    student.status = 'advising_pending';
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

  const subjectIds = Array.isArray(req.body.subjectIds) ? req.body.subjectIds : [];
  const previousStatus = student.status;

  if (['advising_approved', 'payment_pending', 'validation_pending', 'enrolled'].includes(student.status)) {
    res.status(400);
    throw new Error('Cannot modify subjects after advising approval.');
  }

  if (req.body.completedSubjects !== undefined) {
    student.completedSubjects = Array.isArray(req.body.completedSubjects) ? req.body.completedSubjects : [];
  }
  if (req.body.yearLevel !== undefined) {
    student.yearLevel = Number(req.body.yearLevel);
  }

  // Prerequisite validation
  for (const subjectId of subjectIds) {
    const sub = SUBJECTS_CATALOG.find(s => s.id === subjectId);
    if (sub && sub.prerequisites && sub.prerequisites.length > 0) {
      const hasAllPrereqs = sub.prerequisites.every(prereq => student.completedSubjects.includes(prereq));
      if (!hasAllPrereqs) {
        res.status(400);
        throw new Error(`Prerequisites not met for ${sub.name}. Requires: ${sub.prerequisites.join(', ')}`);
      }
    }
  }

  student.selectedSubjects = subjectIds.map((subjectId) => ({
    subjectId,
    addedAt: new Date(),
  }));

  const { tuitionBreakdown, totalTuition } = computeTuition(subjectIds);
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

  const { paymentMethod, success } = req.body;
  if (paymentMethod) student.paymentMethod = paymentMethod;
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
  
  if (!student.studentId) {
    student.studentId = await generateNextId('STU-');
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
    
    // Create user account
    await User.create({
      username: student.studentId,
      email: finalEmail,
      password: 'NCST2026!', // Default password for demo
      firstName: student.firstName,
      lastName: student.lastName,
      role: 'student'
    });
  }

  if (student.programId) {
    student.status = 'advising_pending';
  } else {
    student.status = 'documents_approved';
  }

  student.auditLogs.push({
    action: 'Approved Documents',
    user: req.user ? req.user.username : 'Admissions Officer',
    date: new Date()
  });

  await student.save();
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
  res.json(student);
});

// @desc    Adviser: reject academic evaluation / eligibility
// @route   POST /api/students/:id/reject-advising   body: { notes }
const rejectAdvising = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  if (student.status !== 'advising_pending') {
    res.status(400);
    throw new Error('Invalid action: Student must be pending advising.');
  }

  student.adviserNotes = req.body.notes || '';
  student.status = 'advising_rejected';

  await student.save();
  res.json(student);
});

// @desc    Adviser: approve academic evaluation / eligibility
// @route   POST /api/students/:id/approve-advising   body: { notes }
const approveAdvising = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  if (student.status !== 'advising_pending') {
    res.status(400);
    throw new Error('Invalid action: Student must be pending advising.');
  }

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

  student.paymentStatus = 'paid';
  // Automate Registrar workflow: auto-enroll on payment confirmation
  student.status = 'enrolled';
  student.scheduleGenerated = true;
  student.registrationFormGenerated = true;
  student.receiptGenerated = true;

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

  if (student.status !== 'payment_pending' && student.status !== 'enrolled') {
    res.status(400);
    throw new Error('Invalid action: Student must be pending payment or already enrolled.');
  }

  student.status = 'enrolled';
  student.scheduleGenerated = true;
  student.registrationFormGenerated = true;
  student.receiptGenerated = true;

  await student.save();
  res.json(student);
});

export {
  createDraft,
  applicantLogin,
  getStudents,
  getStudentById,
  registerStudent,
  updateStudent,
  submitDocuments,
  uploadDocument,
  removeDocument,
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
};
