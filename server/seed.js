import bcrypt from 'bcryptjs';
import Student from './Student.js';
import User from './User.js';

// Mirrors src/data/mockData.js plus mock students for demo purposes
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
  {
    _id: 'STU-2026-0001',
    studentId: 'STU-2026-0001',
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria@example.com',
    phone: '0917-111-1111',
    birthDate: '2002-05-15',
    address: '456 Oak St, Manila',
    enrollmentType: 'new',
    programId: null,
    academicTerm: null,
    status: 'documents_submitted',
    documents: [
      { typeId: 'form-138', fileName: 'form-138-maria.pdf', originalName: 'Form_138_Santos.pdf', status: 'pending' },
      { typeId: 'birth-cert', fileName: 'birth-cert-maria.pdf', originalName: 'PSA_Birth_Cert.pdf', status: 'pending' }
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
    studentId: 'STU-2026-0002',
    firstName: 'Carlos',
    lastName: 'Reyes',
    email: 'carlos@example.com',
    phone: '0917-222-2222',
    birthDate: '2001-08-20',
    address: '789 Pine St, Quezon City',
    enrollmentType: 'new',
    programId: 'bscs',
    academicTerm: '1s-2026',
    status: 'advising_pending',
    documents: [
      { typeId: 'form-138', fileName: 'form-138-carlos.pdf', originalName: 'Form_138_Reyes.pdf', status: 'approved' },
      { typeId: 'birth-cert', fileName: 'birth-cert-carlos.pdf', originalName: 'PSA_Birth_Cert.pdf', status: 'approved' }
    ],
    selectedSubjects: [
      { subjectId: 'cs101', sectionId: 'cs101-b' },
      { subjectId: 'cs102', sectionId: 'cs102-b' }
    ],
    tuitionBreakdown: [
      { label: 'CS 101 - Intro to Computing (3 units)', amount: 4500 },
      { label: 'CS 102 - Programming 1 (3 units)', amount: 4500 }
    ],
    totalTuition: 9000,
    paymentMethod: null,
    paymentStatus: 'unpaid',
    scheduleGenerated: false,
    registrationFormGenerated: false,
    receiptGenerated: false,
    admissionNotes: 'Documents verified on-site.',
    adviserNotes: '',
  },
  {
    _id: 'STU-2026-0003',
    studentId: 'STU-2026-0003',
    firstName: 'Ana',
    lastName: 'Torres',
    email: 'ana@example.com',
    phone: '0917-333-3333',
    birthDate: '2003-12-01',
    address: '101 Maple St, Makati',
    enrollmentType: 'new',
    programId: 'bscs',
    academicTerm: '1s-2026',
    status: 'payment_pending',
    documents: [
      { typeId: 'form-138', fileName: 'form-138-ana.pdf', originalName: 'Form_138_Torres.pdf', status: 'approved' },
      { typeId: 'birth-cert', fileName: 'birth-cert-ana.pdf', originalName: 'PSA_Birth_Cert.pdf', status: 'approved' }
    ],
    selectedSubjects: [
      { subjectId: 'cs101', sectionId: 'cs101-b' },
      { subjectId: 'cs102', sectionId: 'cs102-b' }
    ],
    tuitionBreakdown: [
      { label: 'CS 101 - Intro to Computing (3 units)', amount: 4500 },
      { label: 'CS 102 - Programming 1 (3 units)', amount: 4500 }
    ],
    totalTuition: 9000,
    paymentMethod: 'gcash',
    paymentStatus: 'unpaid',
    scheduleGenerated: false,
    registrationFormGenerated: false,
    receiptGenerated: false,
    admissionNotes: 'Documents verified.',
    adviserNotes: 'Approved for 1st Year CS subjects.',
  },
  {
    _id: 'STU-2026-0004',
    studentId: 'STU-2026-0004',
    firstName: 'Miguel',
    lastName: 'Gomez',
    email: 'miguel@example.com',
    phone: '0917-444-4444',
    birthDate: '2001-02-14',
    address: '202 Birch St, Cebu City',
    enrollmentType: 'returning',
    programId: 'bscs',
    academicTerm: null,
    status: 'registration', // will skip admission and get routed by StudentView
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
    holds: [
      {
        type: 'readmission',
        status: 'active',
        description: 'AWOL from previous semester. Please upload Readmission Clearance form from the Dean.',
        createdAt: new Date(),
      }
    ],
    academicRecord: [
      { subjectId: 'cs101', grade: 1.5, term: '1s-2025' },
      { subjectId: 'cs102', grade: 2.0, term: '1s-2025' }
    ]
  }
];

const DEFAULT_STAFF_ROLES = ['student', 'admission', 'adviser', 'accounting', 'registrar', 'admin'];

export async function seedStudents() {
  console.log('Verifying initial applicant records...');
  for (const studentData of INITIAL_STUDENTS) {
    const exists = await Student.exists({ _id: studentData._id });
    if (!exists) {
      await Student.create(studentData);
      console.log(`Seeded student: ${studentData._id}`);
    }
  }
}

export async function seedUsers() {
  console.log('Verifying demo accounts...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const studentIds = ['STU-2026-0000', 'STU-2026-0001', 'STU-2026-0002', 'STU-2026-0003', 'STU-2026-0004'];
  const usersToSeed = [
    ...DEFAULT_STAFF_ROLES.filter(r => r !== 'student').map((role) => ({
      username: role,
      email: `${role}@example.com`,
      password: passwordHash,
      firstName: role.charAt(0).toUpperCase() + role.slice(1),
      lastName: 'Account',
      role,
    })),
    ...studentIds.map((sid, idx) => {
      const emailMap = {
        0: 'student@example.com',
        1: 'maria@example.com',
        2: 'carlos@example.com',
        3: 'ana@example.com',
        4: 'miguel@example.com'
      };
      return {
        username: sid,
        email: emailMap[idx],
        password: passwordHash,
        firstName: idx === 0 ? 'Demo' : (idx === 1 ? 'Maria' : (idx === 2 ? 'Carlos' : (idx === 3 ? 'Ana' : 'Miguel'))),
        lastName: idx === 0 ? 'Student' : (idx === 1 ? 'Santos' : (idx === 2 ? 'Reyes' : (idx === 3 ? 'Torres' : 'Gomez'))),
        role: 'student',
      };
    })
  ];

  for (const userData of usersToSeed) {
    const exists = await User.exists({ username: userData.username });
    if (!exists) {
      await User.collection.insertOne(userData);
      console.log(`Seeded user account: ${userData.username}`);
    }
  }
}
