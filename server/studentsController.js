import asyncHandler from 'express-async-handler';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Student from './Student.js';
import { computeTuition } from './subjectsCatalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Generates the next sequential STU-YYYY-NNNN id, continuing from whatever
// the highest existing id for the current year already is.
async function generateNextStudentId() {
  const year = new Date().getFullYear();
  const prefix = `STU-${year}-`;

  const existing = await Student.find({ _id: { $regex: `^${prefix}` } })
    .select('_id')
    .lean();

  let maxSeq = 0;
  for (const doc of existing) {
    const seq = parseInt(doc._id.slice(prefix.length), 10);
    if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}

async function findStudentOr404(res, id) {
  const student = await Student.findById(id);
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
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;
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

  const id = await generateNextStudentId();

  const student = await Student.create({
    _id: id,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    status: 'registration',
  });

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

  student.status = 'documents_submitted';
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

  student.selectedSubjects = subjectIds.map((subjectId) => ({
    subjectId,
    addedAt: new Date(),
  }));

  const { tuitionBreakdown, totalTuition } = computeTuition(subjectIds);
  student.tuitionBreakdown = tuitionBreakdown;
  student.totalTuition = totalTuition;

  // Only auto-advance to payment once the adviser has already approved the
  // student (if advising hasn't happened yet, this is just the adviser
  // pre-selecting subjects, so we leave the status alone).
  if (subjectIds.length > 0 && ['advising_approved', 'enrollment_pending'].includes(previousStatus)) {
    student.status = 'payment_pending';
  } else if (subjectIds.length === 0 && previousStatus === 'payment_pending') {
    student.status = 'advising_approved';
  }

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
  student.paymentStatus = success ? 'paid' : 'failed';

  await student.save();
  res.json(student);
});

// @desc    Admission: approve submitted documents
// @route   POST /api/students/:id/approve-admission   body: { notes }
const approveAdmission = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  student.admissionNotes = req.body.notes || '';
  student.status = 'documents_approved';

  await student.save();
  res.json(student);
});

// @desc    Admission: reject submitted documents, ask for resubmission
// @route   POST /api/students/:id/reject-admission   body: { notes }
const rejectAdmission = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  student.admissionNotes = req.body.notes || '';
  student.status = 'documents_rejected';

  await student.save();
  res.json(student);
});

// @desc    Adviser: approve academic evaluation / eligibility
// @route   POST /api/students/:id/approve-advising   body: { notes }
const approveAdvising = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  student.adviserNotes = req.body.notes || '';
  student.status = 'advising_approved';

  await student.save();
  res.json(student);
});

// @desc    Accounting: confirm a payment has been received
// @route   POST /api/students/:id/confirm-payment
const confirmPayment = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  student.paymentStatus = 'paid';
  student.status = 'validation_pending';

  await student.save();
  res.json(student);
});

// @desc    Registrar: final validation, officially enrolls the student
// @route   POST /api/students/:id/validate-enrollment
const validateEnrollment = asyncHandler(async (req, res) => {
  const student = await findStudentOr404(res, req.params.id);
  if (!student) return;

  student.status = 'enrolled';
  student.scheduleGenerated = true;
  student.registrationFormGenerated = true;
  student.receiptGenerated = true;

  await student.save();
  res.json(student);
});

export {
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
};
