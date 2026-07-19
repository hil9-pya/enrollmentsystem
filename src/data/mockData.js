// ============================================================================
// Mock Data — College Student Enrollment System (Philippines)
// ============================================================================

// ---------------------------------------------------------------------------
// 1. PROGRAMS
// ---------------------------------------------------------------------------
export const PROGRAMS = [
  { id: 'bscs', name: 'BS Computer Science', department: 'College of Computing', totalUnits: 160 },
  { id: 'bsba', name: 'BS Business Administration', department: 'College of Business', totalUnits: 144 },
  { id: 'bsn', name: 'BS Nursing', department: 'College of Health Sciences', totalUnits: 180 },
];

// ---------------------------------------------------------------------------
// 2. ACADEMIC TERMS
// ---------------------------------------------------------------------------
export const ACADEMIC_TERMS = [
  { id: '1s-2026', label: '1st Semester 2026-2027' },
  { id: '2s-2026', label: '2nd Semester 2026-2027' },
];

export const ACTIVE_TERM_ID = '1s-2026';

// ---------------------------------------------------------------------------
// 3. SUBJECTS
// ---------------------------------------------------------------------------
export const SUBJECTS = [
  // ── BSCS Subjects ──────────────────────────────────────────────────────
  {
    id: 'cs101',
    code: 'CS 101',
    name: 'Intro to Computing',
    units: 3,
    programId: 'bscs',
    yearLevel: 1,
    semester: 1,
    prerequisites: [],
    sections: [
      { id: 'cs101-a', code: 'CS 101-A', schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: 'Room 301' }, instructor: 'Prof. Renato Villanueva', maxSlots: 40, enrolledCount: 40 }, // FULL
      { id: 'cs101-b', code: 'CS 101-B', schedule: { day: 'TTH', time: '9:00 AM - 10:30 AM', room: 'Room 302' }, instructor: 'Prof. Lourdes Bautista', maxSlots: 40, enrolledCount: 20 }
    ],
    fee: 4500,
  },
  {
    id: 'cs102',
    code: 'CS 102',
    name: 'Programming 1',
    units: 3,
    programId: 'bscs',
    yearLevel: 1,
    semester: 1,
    prerequisites: [],
    sections: [
      { id: 'cs102-a', code: 'CS 102-A', schedule: { day: 'TTH', time: '10:00 AM - 11:30 AM', room: 'Room 302' }, instructor: 'Prof. Lourdes Bautista', maxSlots: 40, enrolledCount: 37 },
      { id: 'cs102-b', code: 'CS 102-B', schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 301' }, instructor: 'Prof. Renato Villanueva', maxSlots: 40, enrolledCount: 15 }
    ],
    fee: 4500,
  },
  {
    id: 'cs201',
    code: 'CS 201',
    name: 'Data Structures',
    units: 3,
    programId: 'bscs',
    yearLevel: 2,
    semester: 1,
    prerequisites: ['cs102'],
    sections: [
      { id: 'cs201-a', code: 'CS 201-A', schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 303' }, instructor: 'Prof. Andres Dela Cruz', maxSlots: 40, enrolledCount: 29 },
      { id: 'cs201-b', code: 'CS 201-B', schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 304' }, instructor: 'Prof. Margarita Ramos', maxSlots: 40, enrolledCount: 10 }
    ],
    fee: 4500,
  },
  {
    id: 'cs202',
    code: 'CS 202',
    name: 'Object-Oriented Programming',
    units: 3,
    programId: 'bscs',
    yearLevel: 2,
    semester: 1,
    prerequisites: ['cs102'],
    sections: [
      { id: 'cs202-a', code: 'CS 202-A', schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 304' }, instructor: 'Prof. Margarita Ramos', maxSlots: 40, enrolledCount: 31 },
      { id: 'cs202-b', code: 'CS 202-B', schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 303' }, instructor: 'Prof. Andres Dela Cruz', maxSlots: 40, enrolledCount: 12 }
    ],
    fee: 4500,
  },
  {
    id: 'cs301',
    code: 'CS 301',
    name: 'Algorithms',
    units: 3,
    programId: 'bscs',
    yearLevel: 3,
    semester: 1,
    prerequisites: ['cs201'],
    sections: [
      { id: 'cs301-a', code: 'CS 301-A', schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 305' }, instructor: 'Prof. Danilo Mendoza', maxSlots: 40, enrolledCount: 26 },
      { id: 'cs301-b', code: 'CS 301-B', schedule: { day: 'TTH', time: '3:00 PM - 4:30 PM', room: 'Room 306' }, instructor: 'Prof. Cecilia Aguilar', maxSlots: 40, enrolledCount: 8 }
    ],
    fee: 4500,
  },
  {
    id: 'cs302',
    code: 'CS 302',
    name: 'Database Systems',
    units: 3,
    programId: 'bscs',
    yearLevel: 3,
    semester: 1,
    prerequisites: ['cs201'],
    sections: [
      { id: 'cs302-a', code: 'CS 302-A', schedule: { day: 'TTH', time: '8:00 AM - 9:30 AM', room: 'Room 306' }, instructor: 'Prof. Cecilia Aguilar', maxSlots: 40, enrolledCount: 28 },
      { id: 'cs302-b', code: 'CS 302-B', schedule: { day: 'MWF', time: '3:00 PM - 4:30 PM', room: 'Room 305' }, instructor: 'Prof. Danilo Mendoza', maxSlots: 40, enrolledCount: 14 }
    ],
    fee: 4500,
  },

  // ── BSBA Subjects ──────────────────────────────────────────────────────
  {
    id: 'ba101',
    code: 'BA 101',
    name: 'Intro to Business',
    units: 3,
    programId: 'bsba',
    yearLevel: 1,
    semester: 1,
    prerequisites: [],
    sections: [
      { id: 'ba101-a', code: 'BA 101-A', schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: 'Room 401' }, instructor: 'Prof. Ricardo Gonzales', maxSlots: 40, enrolledCount: 35 },
      { id: 'ba101-b', code: 'BA 101-B', schedule: { day: 'TTH', time: '9:00 AM - 10:30 AM', room: 'Room 402' }, instructor: 'Prof. Elena Soriano', maxSlots: 40, enrolledCount: 12 }
    ],
    fee: 4500,
  },
  {
    id: 'ba102',
    code: 'BA 102',
    name: 'Accounting Fundamentals',
    units: 3,
    programId: 'bsba',
    yearLevel: 1,
    semester: 1,
    prerequisites: [],
    sections: [
      { id: 'ba102-a', code: 'BA 102-A', schedule: { day: 'TTH', time: '10:00 AM - 11:30 AM', room: 'Room 402' }, instructor: 'Prof. Elena Soriano', maxSlots: 40, enrolledCount: 32 },
      { id: 'ba102-b', code: 'BA 102-B', schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 401' }, instructor: 'Prof. Ricardo Gonzales', maxSlots: 40, enrolledCount: 15 }
    ],
    fee: 4500,
  },
  {
    id: 'ba201',
    code: 'BA 201',
    name: 'Principles of Marketing',
    units: 3,
    programId: 'bsba',
    yearLevel: 2,
    semester: 1,
    prerequisites: ['ba101'],
    sections: [
      { id: 'ba201-a', code: 'BA 201-A', schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 403' }, instructor: 'Prof. Fernando Aquino', maxSlots: 40, enrolledCount: 27 },
      { id: 'ba201-b', code: 'BA 201-B', schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 404' }, instructor: 'Prof. Patricia Lagman', maxSlots: 40, enrolledCount: 8 }
    ],
    fee: 4500,
  },
  {
    id: 'ba202',
    code: 'BA 202',
    name: 'Corporate Finance',
    units: 3,
    programId: 'bsba',
    yearLevel: 2,
    semester: 1,
    prerequisites: ['ba102'],
    sections: [
      { id: 'ba202-a', code: 'BA 202-A', schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 404' }, instructor: 'Prof. Patricia Lagman', maxSlots: 40, enrolledCount: 30 },
      { id: 'ba202-b', code: 'BA 202-B', schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 403' }, instructor: 'Prof. Fernando Aquino', maxSlots: 40, enrolledCount: 11 }
    ],
    fee: 4500,
  },
  {
    id: 'ba301',
    code: 'BA 301',
    name: 'Strategic Management',
    units: 3,
    programId: 'bsba',
    yearLevel: 3,
    semester: 1,
    prerequisites: ['ba201'],
    sections: [
      { id: 'ba301-a', code: 'BA 301-A', schedule: { day: 'MWF', time: '3:00 PM - 4:30 PM', room: 'Room 405' }, instructor: 'Prof. Gabriel Pascual', maxSlots: 40, enrolledCount: 25 },
      { id: 'ba301-b', code: 'BA 301-B', schedule: { day: 'TTH', time: '3:00 PM - 4:30 PM', room: 'Room 406' }, instructor: 'Prof. Patricia Lagman', maxSlots: 40, enrolledCount: 9 }
    ],
    fee: 4500,
  },

  // ── BSN Subjects ───────────────────────────────────────────────────────
  {
    id: 'nu101',
    code: 'NU 101',
    name: 'Anatomy and Physiology',
    units: 3,
    programId: 'bsn',
    yearLevel: 1,
    semester: 1,
    prerequisites: [],
    sections: [
      { id: 'nu101-a', code: 'NU 101-A', schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: 'Room 501' }, instructor: 'Prof. Teresa Castillo', maxSlots: 40, enrolledCount: 36 },
      { id: 'nu101-b', code: 'NU 101-B', schedule: { day: 'TTH', time: '9:00 AM - 10:30 AM', room: 'Room 502' }, instructor: 'Prof. Rosario Dizon', maxSlots: 40, enrolledCount: 15 }
    ],
    fee: 4500,
  },
  {
    id: 'nu102',
    code: 'NU 102',
    name: 'Fundamentals of Nursing',
    units: 3,
    programId: 'bsn',
    yearLevel: 1,
    semester: 1,
    prerequisites: [],
    sections: [
      { id: 'nu102-a', code: 'NU 102-A', schedule: { day: 'TTH', time: '10:00 AM - 11:30 AM', room: 'Room 502' }, instructor: 'Prof. Rosario Dizon', maxSlots: 40, enrolledCount: 34 },
      { id: 'nu102-b', code: 'NU 102-B', schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 501' }, instructor: 'Prof. Teresa Castillo', maxSlots: 40, enrolledCount: 18 }
    ],
    fee: 4500,
  },
  {
    id: 'nu103',
    code: 'NU 103',
    name: 'Health Assessment',
    units: 3,
    programId: 'bsn',
    yearLevel: 1,
    semester: 1,
    prerequisites: [],
    sections: [
      { id: 'nu103-a', code: 'NU 103-A', schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 503' }, instructor: 'Prof. Josefina Manalo', maxSlots: 40, enrolledCount: 38 },
      { id: 'nu103-b', code: 'NU 103-B', schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 504' }, instructor: 'Prof. Rosario Dizon', maxSlots: 40, enrolledCount: 10 }
    ],
    fee: 4500,
  },
  {
    id: 'nu201',
    code: 'NU 201',
    name: 'Pharmacology',
    units: 3,
    programId: 'bsn',
    yearLevel: 2,
    semester: 1,
    prerequisites: ['nu101'],
    sections: [
      { id: 'nu201-a', code: 'NU 201-A', schedule: { day: 'TTH', time: '8:00 AM - 9:30 AM', room: 'Room 504' }, instructor: 'Prof. Alberto Evangelista', maxSlots: 40, enrolledCount: 27 },
      { id: 'nu201-b', code: 'NU 201-B', schedule: { day: 'MWF', time: '3:00 PM - 4:30 PM', room: 'Room 503' }, instructor: 'Prof. Teresa Castillo', maxSlots: 40, enrolledCount: 12 }
    ],
    fee: 4500,
  },
  {
    id: 'nu202',
    code: 'NU 202',
    name: 'Medical-Surgical Nursing',
    units: 3,
    programId: 'bsn',
    yearLevel: 2,
    semester: 1,
    prerequisites: ['nu102'],
    sections: [
      { id: 'nu202-a', code: 'NU 202-A', schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 505' }, instructor: 'Prof. Carmela Salazar', maxSlots: 40, enrolledCount: 30 },
      { id: 'nu202-b', code: 'NU 202-B', schedule: { day: 'TTH', time: '3:00 PM - 4:30 PM', room: 'Room 506' }, instructor: 'Prof. Roberto Santiago', maxSlots: 40, enrolledCount: 14 }
    ],
    fee: 4500,
  },
  {
    id: 'nu301',
    code: 'NU 301',
    name: 'Community Health Nursing',
    units: 3,
    programId: 'bsn',
    yearLevel: 3,
    semester: 1,
    prerequisites: ['nu202'],
    sections: [
      { id: 'nu301-a', code: 'NU 301-A', schedule: { day: 'TTH', time: '3:00 PM - 4:30 PM', room: 'Room 506' }, instructor: 'Prof. Roberto Santiago', maxSlots: 40, enrolledCount: 26 },
      { id: 'nu301-b', code: 'NU 301-B', schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: 'Room 505' }, instructor: 'Prof. Carmela Salazar', maxSlots: 40, enrolledCount: 8 }
    ],
    fee: 4500,
  },
];

// ---------------------------------------------------------------------------
// 4. REQUIRED DOCUMENTS
// ---------------------------------------------------------------------------
export const REQUIRED_DOCUMENTS = [
  // ── New Student ──────────────────────────────────────────────────────────────
  {
    id: 'form-138',
    label: 'Form 138 (Original Report Card)',
    description: 'Original copy of your Senior High School Report Card issued by your school.',
    requiredFor: ['new'],
  },
  {
    id: 'form-137',
    label: 'Form 137 (Scholastic Record)',
    description: 'Official scholastic records/permanent record forwarded from your previous school.',
    requiredFor: ['new'],
  },
  // ── Transferee Documents ─────────────────────────────────────────────────────
  {
    id: 'honorable-dismissal',
    label: 'Certificate of Honorable Dismissal / Transfer Credentials',
    description: 'Issued by the Registrar of your previous college/university, certifying that you are in good standing and cleared all obligations.',
    requiredFor: ['transfer'],
  },
  {
    id: 'tor',
    label: 'Official Transcript of Records (TOR)',
    description: 'Official sealed Transcript of Records from your previous institution showing all subjects taken and grades earned. Must be a certified true copy.',
    requiredFor: ['transfer'],
  },
  {
    id: 'course-description',
    label: 'Course Descriptions / Syllabus',
    description: 'Copies of the course descriptions or syllabi for subjects you want credited for assessment and possible credit transfer evaluation.',
    requiredFor: ['transfer'],
  },
  // ── Shared by New & Transfer ─────────────────────────────────────────────────
  {
    id: 'birth-cert',
    label: 'PSA Birth Certificate (Original / Certified)',
    description: 'Authenticated original copy from the Philippine Statistics Authority (PSA). E-copy or photocopy is not accepted.',
    requiredFor: ['new', 'transfer'],
  },
  {
    id: 'good-moral',
    label: 'Certificate of Good Moral Character',
    description: 'Signed by your school principal, guidance counselor, or dean from your previous institution. Must be issued within the last 6 months.',
    requiredFor: ['new', 'transfer'],
  },
  // ── Returning Student ────────────────────────────────────────────────────────
  {
    id: 'readmission-form',
    label: 'Re-admission Form',
    description: 'Duly accomplished re-admission form available from the Office of the Registrar.',
    requiredFor: ['returning'],
  },
  {
    id: 'clearance-returning',
    label: 'School Clearance (Returning)',
    description: 'Clearance from all school departments verifying no outstanding obligations before re-admission.',
    requiredFor: ['returning'],
  },
  // ── Optional for All ─────────────────────────────────────────────────────────
  {
    id: '2x2-photo',
    label: '2×2 ID Photos (White Background)',
    description: '4 pieces of 2×2 ID photos with white background, taken within the last 3 months. Must be in formal attire.',
    optionalFor: ['new', 'transfer', 'returning'],
  },
  {
    id: 'med-cert',
    label: 'Medical Certificate',
    description: 'Issued by a licensed physician or the school clinic. Certifies you are fit to enroll.',
    optionalFor: ['new', 'transfer', 'returning'],
  },
  {
    id: 'marriage-cert',
    label: 'Marriage Certificate (if applicable)',
    description: 'PSA-authenticated Marriage Certificate if your current name differs from your documents.',
    optionalFor: ['new', 'transfer', 'returning'],
  },
];

// ---------------------------------------------------------------------------
// 5. MISCELLANEOUS FEES
// ---------------------------------------------------------------------------
export const MISC_FEES = [
  { label: 'Library Fee', amount: 1500 },
  { label: 'Laboratory Fee', amount: 2500 },
  { label: 'Athletic Fee', amount: 800 },
  { label: 'Student Activity Fee', amount: 1200 },
  { label: 'Technology Fee', amount: 2000 },
  { label: 'Registration Fee', amount: 500 },
];

// ---------------------------------------------------------------------------
// 6. PAYMENT METHODS
// ---------------------------------------------------------------------------
export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash (Over-the-Counter)', icon: 'Banknote' },
  { id: 'bank', label: 'Bank Transfer', icon: 'Building2' },
  { id: 'card', label: 'Credit / Debit Card', icon: 'CreditCard' },
  { id: 'gcash', label: 'GCash', icon: 'Smartphone' },
];

// ---------------------------------------------------------------------------
// 7. ENROLLMENT TYPES
// ---------------------------------------------------------------------------
export const ENROLLMENT_TYPES = [
  { id: 'new', label: 'New Student', description: 'First-time enrollment at this institution', icon: 'UserPlus' },
  { id: 'returning', label: 'Returning Student', description: 'Previously enrolled, re-enrolling after a leave', icon: 'UserCheck' },
  { id: 'transfer', label: 'Transfer Student', description: 'Transferring from another institution', icon: 'ArrowRightLeft' },
  { id: 'continuing', label: 'Continuing Student', description: 'Proceeding to the next academic term', icon: 'GraduationCap' },
];

// ---------------------------------------------------------------------------
// 8. STATUS CONFIGURATION
// ---------------------------------------------------------------------------
export const STATUS_CONFIG = {
  registration:         { label: 'Registration', color: 'slate' },
  documents_submitted:  { label: 'Documents Submitted', color: 'amber' },
  documents_approved:   { label: 'Documents Approved', color: 'emerald' },
  documents_rejected:   { label: 'Resubmission Required', color: 'rose' },
  advising_pending:     { label: 'Pending Advising', color: 'amber' },
  advising_approved:    { label: 'Advising Approved', color: 'emerald' },
  enrollment_pending:   { label: 'Subject Enrollment', color: 'indigo' },
  payment_pending:      { label: 'Payment Pending', color: 'amber' },
  payment_confirmed:    { label: 'Payment Confirmed', color: 'emerald' },
  validation_pending:   { label: 'Pending Validation', color: 'amber' },
  enrolled:             { label: 'Enrolled', color: 'emerald' },
};

// ---------------------------------------------------------------------------
// 9. INITIAL STUDENTS
// ---------------------------------------------------------------------------
export const INITIAL_STUDENTS = [
  // Blank template record — the Student Portal defaults a first-time,
  // not-yet-registered visitor's active student id to this record.
  {
    id: 'APP-2026-0000',
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
