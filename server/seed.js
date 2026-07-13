import bcrypt from 'bcryptjs';
import Student from './Student.js';
import User from './User.js';

// Mirrors src/data/mockData.js -> INITIAL_STUDENTS, plus one blank
// "STU-2026-0006" template record. The frontend (EnrollmentContext.jsx)
// defaults a fresh visitor's activeStudentId to 'STU-2026-0006', so that
// record must always exist for the student portal's demo flow to work.
const INITIAL_STUDENTS = [
  // Blank template record — the Student Portal defaults a first-time,
  // not-yet-registered visitor's active student id to this record.
  {
    _id: 'APP-2026-0000',
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
  // Approved student record — for the demo student portal account to work
  {
    _id: 'STU-2026-0000',
    studentId: 'STU-2026-0000',
    firstName: 'Demo',
    lastName: 'Student',
    email: 'student@example.com',
    phone: '0917-000-0000',
    birthDate: '2000-01-01',
    address: '123 Demo St.',
    enrollmentType: 'new',
    programId: null,
    academicTerm: null,
    status: 'documents_approved',
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
  const count = await Student.countDocuments();
  if (count > 0) return;
  
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
    username: role === 'student' ? 'STU-2026-0000' : role,
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
