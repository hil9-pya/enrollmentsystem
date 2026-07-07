import bcrypt from 'bcryptjs';
import Student from './Student.js';
import User from './User.js';

// Mirrors src/data/mockData.js -> INITIAL_STUDENTS, plus one blank
// "STU-2026-0006" template record. The frontend (EnrollmentContext.jsx)
// defaults a fresh visitor's activeStudentId to 'STU-2026-0006', so that
// record must always exist for the student portal's demo flow to work.
const INITIAL_STUDENTS = [
  {
    _id: 'STU-2026-0001',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria.santos@email.com',
    phone: '0917-123-4567',
    birthDate: '2005-03-15',
    address: '123 Rizal St., Quezon City',
    enrollmentType: 'new',
    programId: 'bscs',
    academicTerm: '1s-2026',
    status: 'documents_submitted',
    documents: [
      { typeId: 'form-138', fileName: 'maria_form138.pdf', originalName: 'maria_form138.pdf', uploadedAt: '2026-06-25T10:00:00', status: 'pending' },
      { typeId: 'form-137', fileName: 'maria_form137.pdf', originalName: 'maria_form137.pdf', uploadedAt: '2026-06-25T10:05:00', status: 'pending' },
      { typeId: 'birth-cert', fileName: 'maria_birthcert.pdf', originalName: 'maria_birthcert.pdf', uploadedAt: '2026-06-25T10:20:00', status: 'pending' },
      { typeId: 'good-moral', fileName: 'maria_goodmoral.pdf', originalName: 'maria_goodmoral.pdf', uploadedAt: '2026-06-25T10:15:00', status: 'pending' },
      { typeId: '2x2-photo', fileName: 'maria_photo.jpg', originalName: 'maria_photo.jpg', uploadedAt: '2026-06-25T10:25:00', status: 'pending' },
    ],
    selectedSubjects: [],
    tuitionBreakdown: [],
    totalTuition: 0,
    paymentMethod: null,
    paymentStatus: 'unpaid',
    scheduleGenerated: false,
    registrationFormGenerated: false,
    receiptGenerated: false,
    admissionNotes: '',
    adviserNotes: '',
  },
  {
    _id: 'STU-2026-0002',
    firstName: 'Carlos',
    lastName: 'Reyes',
    email: 'carlos.reyes@email.com',
    phone: '0918-234-5678',
    birthDate: '2004-08-22',
    address: '45 Mabini Ave., Manila',
    enrollmentType: 'returning',
    programId: 'bscs',
    academicTerm: '1s-2026',
    status: 'advising_pending',
    documents: [
      { typeId: 'form-138', fileName: 'carlos_form138.pdf', originalName: 'carlos_form138.pdf', uploadedAt: '2026-06-20T09:00:00', status: 'approved' },
      { typeId: 'form-137', fileName: 'carlos_form137.pdf', originalName: 'carlos_form137.pdf', uploadedAt: '2026-06-20T09:05:00', status: 'approved' },
      { typeId: 'birth-cert', fileName: 'carlos_birthcert.pdf', originalName: 'carlos_birthcert.pdf', uploadedAt: '2026-06-20T09:20:00', status: 'approved' },
      { typeId: 'good-moral', fileName: 'carlos_goodmoral.pdf', originalName: 'carlos_goodmoral.pdf', uploadedAt: '2026-06-20T09:15:00', status: 'approved' },
      { typeId: '2x2-photo', fileName: 'carlos_photo.jpg', originalName: 'carlos_photo.jpg', uploadedAt: '2026-06-20T09:25:00', status: 'approved' },
    ],
    selectedSubjects: [{ subjectId: 'cs201' }, { subjectId: 'cs202' }],
    tuitionBreakdown: [
      { label: 'CS 201 - Data Structures', amount: 4500 },
      { label: 'CS 202 - Object-Oriented Programming', amount: 4500 },
      { label: 'Library Fee', amount: 1500 },
      { label: 'Laboratory Fee', amount: 2500 },
      { label: 'Athletic Fee', amount: 800 },
      { label: 'Student Activity Fee', amount: 1200 },
      { label: 'Technology Fee', amount: 2000 },
      { label: 'Registration Fee', amount: 500 },
    ],
    totalTuition: 17500,
    paymentMethod: null,
    paymentStatus: 'unpaid',
    scheduleGenerated: false,
    registrationFormGenerated: false,
    receiptGenerated: false,
    admissionNotes: 'Documents verified and complete.',
    adviserNotes: '',
  },
  {
    _id: 'STU-2026-0003',
    firstName: 'Ana',
    lastName: 'Torres',
    email: 'ana.torres@email.com',
    phone: '0919-345-6789',
    birthDate: '2005-01-10',
    address: '78 Bonifacio Blvd., Makati',
    enrollmentType: 'new',
    programId: 'bsba',
    academicTerm: '1s-2026',
    status: 'payment_pending',
    documents: [
      { typeId: 'form-138', fileName: 'ana_form138.pdf', originalName: 'ana_form138.pdf', uploadedAt: '2026-06-18T08:00:00', status: 'approved' },
      { typeId: 'form-137', fileName: 'ana_form137.pdf', originalName: 'ana_form137.pdf', uploadedAt: '2026-06-18T08:05:00', status: 'approved' },
      { typeId: 'birth-cert', fileName: 'ana_birthcert.pdf', originalName: 'ana_birthcert.pdf', uploadedAt: '2026-06-18T08:20:00', status: 'approved' },
      { typeId: 'good-moral', fileName: 'ana_goodmoral.pdf', originalName: 'ana_goodmoral.pdf', uploadedAt: '2026-06-18T08:15:00', status: 'approved' },
      { typeId: '2x2-photo', fileName: 'ana_photo.jpg', originalName: 'ana_photo.jpg', uploadedAt: '2026-06-18T08:25:00', status: 'approved' },
    ],
    selectedSubjects: [
      { subjectId: 'ba101' },
      { subjectId: 'ba102' },
      { subjectId: 'ba201' },
      { subjectId: 'ba202' },
    ],
    tuitionBreakdown: [
      { label: 'BA 101 - Intro to Business', amount: 4500 },
      { label: 'BA 102 - Accounting Fundamentals', amount: 4500 },
      { label: 'BA 201 - Principles of Marketing', amount: 4500 },
      { label: 'BA 202 - Corporate Finance', amount: 4500 },
      { label: 'Library Fee', amount: 1500 },
      { label: 'Laboratory Fee', amount: 2500 },
      { label: 'Athletic Fee', amount: 800 },
      { label: 'Student Activity Fee', amount: 1200 },
      { label: 'Technology Fee', amount: 2000 },
      { label: 'Registration Fee', amount: 500 },
    ],
    totalTuition: 26500,
    paymentMethod: null,
    paymentStatus: 'unpaid',
    scheduleGenerated: false,
    registrationFormGenerated: false,
    receiptGenerated: false,
    admissionNotes: 'All requirements complete.',
    adviserNotes: 'Eligible for all selected subjects. Prerequisites satisfied.',
  },
  {
    _id: 'STU-2026-0004',
    firstName: 'Miguel',
    lastName: 'Cruz',
    email: 'miguel.cruz@email.com',
    phone: '0920-456-7890',
    birthDate: '2004-11-05',
    address: '15 Luna St., Pasig City',
    enrollmentType: 'transfer',
    programId: 'bsn',
    academicTerm: '1s-2026',
    status: 'validation_pending',
    documents: [
      { typeId: 'form-138', fileName: 'miguel_form138.pdf', originalName: 'miguel_form138.pdf', uploadedAt: '2026-06-15T11:00:00', status: 'approved' },
      { typeId: 'form-137', fileName: 'miguel_form137.pdf', originalName: 'miguel_form137.pdf', uploadedAt: '2026-06-15T11:05:00', status: 'approved' },
      { typeId: 'birth-cert', fileName: 'miguel_birthcert.pdf', originalName: 'miguel_birthcert.pdf', uploadedAt: '2026-06-15T11:20:00', status: 'approved' },
      { typeId: 'good-moral', fileName: 'miguel_goodmoral.pdf', originalName: 'miguel_goodmoral.pdf', uploadedAt: '2026-06-15T11:15:00', status: 'approved' },
      { typeId: '2x2-photo', fileName: 'miguel_photo.jpg', originalName: 'miguel_photo.jpg', uploadedAt: '2026-06-15T11:25:00', status: 'approved' },
      { typeId: 'med-cert', fileName: 'miguel_medcert.pdf', originalName: 'miguel_medcert.pdf', uploadedAt: '2026-06-15T11:30:00', status: 'approved' },
    ],
    selectedSubjects: [{ subjectId: 'nu101' }, { subjectId: 'nu102' }, { subjectId: 'nu103' }],
    tuitionBreakdown: [
      { label: 'NU 101 - Anatomy and Physiology', amount: 4500 },
      { label: 'NU 102 - Fundamentals of Nursing', amount: 4500 },
      { label: 'NU 103 - Health Assessment', amount: 4500 },
      { label: 'Library Fee', amount: 1500 },
      { label: 'Laboratory Fee', amount: 2500 },
      { label: 'Athletic Fee', amount: 800 },
      { label: 'Student Activity Fee', amount: 1200 },
      { label: 'Technology Fee', amount: 2000 },
      { label: 'Registration Fee', amount: 500 },
    ],
    totalTuition: 22000,
    paymentMethod: 'gcash',
    paymentStatus: 'paid',
    scheduleGenerated: false,
    registrationFormGenerated: false,
    receiptGenerated: false,
    admissionNotes: 'Transfer credentials verified.',
    adviserNotes: 'Cleared for first-year nursing subjects.',
  },
  {
    _id: 'STU-2026-0005',
    firstName: 'Isabella',
    lastName: 'Navarro',
    email: 'isabella.navarro@email.com',
    phone: '0921-567-8901',
    birthDate: '2004-05-20',
    address: '200 Aguinaldo Highway, Cavite',
    enrollmentType: 'continuing',
    programId: 'bscs',
    academicTerm: '1s-2026',
    status: 'enrolled',
    documents: [
      { typeId: 'form-138', fileName: 'isabella_form138.pdf', originalName: 'isabella_form138.pdf', uploadedAt: '2026-06-10T14:00:00', status: 'approved' },
      { typeId: 'form-137', fileName: 'isabella_form137.pdf', originalName: 'isabella_form137.pdf', uploadedAt: '2026-06-10T14:05:00', status: 'approved' },
      { typeId: 'birth-cert', fileName: 'isabella_birthcert.pdf', originalName: 'isabella_birthcert.pdf', uploadedAt: '2026-06-10T14:20:00', status: 'approved' },
      { typeId: 'good-moral', fileName: 'isabella_goodmoral.pdf', originalName: 'isabella_goodmoral.pdf', uploadedAt: '2026-06-10T14:15:00', status: 'approved' },
      { typeId: '2x2-photo', fileName: 'isabella_photo.jpg', originalName: 'isabella_photo.jpg', uploadedAt: '2026-06-10T14:25:00', status: 'approved' },
    ],
    selectedSubjects: [
      { subjectId: 'cs201' },
      { subjectId: 'cs202' },
      { subjectId: 'cs301' },
      { subjectId: 'cs302' },
    ],
    tuitionBreakdown: [
      { label: 'CS 201 - Data Structures', amount: 4500 },
      { label: 'CS 202 - Object-Oriented Programming', amount: 4500 },
      { label: 'CS 301 - Algorithms', amount: 4500 },
      { label: 'CS 302 - Database Systems', amount: 4500 },
      { label: 'Library Fee', amount: 1500 },
      { label: 'Laboratory Fee', amount: 2500 },
      { label: 'Athletic Fee', amount: 800 },
      { label: 'Student Activity Fee', amount: 1200 },
      { label: 'Technology Fee', amount: 2000 },
      { label: 'Registration Fee', amount: 500 },
    ],
    totalTuition: 26500,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    scheduleGenerated: true,
    registrationFormGenerated: true,
    receiptGenerated: true,
    admissionNotes: 'Continuing student, documents on file.',
    adviserNotes: 'All prerequisites met. Approved for 3rd year subjects.',
  },
  // Blank template record — the Student Portal defaults a first-time,
  // not-yet-registered visitor's active student id to this record.
  {
    _id: 'STU-2026-0006',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    enrollmentType: null,
    programId: null,
    academicTerm: null,
    status: 'registration',
    documents: [],
    selectedSubjects: [],
    tuitionBreakdown: [],
    totalTuition: 0,
    paymentMethod: null,
    paymentStatus: 'unpaid',
    scheduleGenerated: false,
    registrationFormGenerated: false,
    receiptGenerated: false,
    admissionNotes: '',
    adviserNotes: '',
  },
];

const DEFAULT_STAFF_ROLES = ['student', 'admission', 'adviser', 'accounting', 'registrar', 'admin'];

export async function seedStudents() {
  await Student.deleteMany({});
  console.log('Cleared existing student records. Seeding initial applicant records...');
  await Student.insertMany(INITIAL_STUDENTS);
  console.log(`Seeded ${INITIAL_STUDENTS.length} student records.`);
}

export async function seedUsers() {
  const count = await User.countDocuments();
  if (count > 0) return;

  console.log('Users collection empty. Seeding default demo accounts...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = DEFAULT_STAFF_ROLES.map((role) => ({
    username: role,
    email: `${role}@example.com`,
    // Insert the hash directly (bypassing the pre-save hook) since it's
    // already hashed — the same technique the original migration.js used.
    password: passwordHash,
    firstName: role.charAt(0).toUpperCase() + role.slice(1),
    lastName: 'Account',
    role,
  }));

  await User.collection.insertMany(users);
  console.log(`Seeded ${users.length} demo accounts (password: password123).`);
}
