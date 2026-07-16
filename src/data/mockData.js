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
  { id: 'sum-2027', label: 'Summer 2027' },
];

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
    schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: 'Room 301' },
    instructor: 'Prof. Renato Villanueva',
    maxSlots: 40,
    enrolledCount: 33,
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
    schedule: { day: 'TTH', time: '10:00 AM - 11:30 AM', room: 'Room 302' },
    instructor: 'Prof. Lourdes Bautista',
    maxSlots: 40,
    enrolledCount: 37,
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
    schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 303' },
    instructor: 'Prof. Andres Dela Cruz',
    maxSlots: 40,
    enrolledCount: 29,
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
    schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 304' },
    instructor: 'Prof. Margarita Ramos',
    maxSlots: 40,
    enrolledCount: 31,
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
    schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 305' },
    instructor: 'Prof. Danilo Mendoza',
    maxSlots: 40,
    enrolledCount: 26,
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
    schedule: { day: 'TTH', time: '8:00 AM - 9:30 AM', room: 'Room 306' },
    instructor: 'Prof. Cecilia Aguilar',
    maxSlots: 40,
    enrolledCount: 28,
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
    schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: 'Room 401' },
    instructor: 'Prof. Ricardo Gonzales',
    maxSlots: 40,
    enrolledCount: 35,
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
    schedule: { day: 'TTH', time: '10:00 AM - 11:30 AM', room: 'Room 402' },
    instructor: 'Prof. Elena Soriano',
    maxSlots: 40,
    enrolledCount: 32,
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
    schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 403' },
    instructor: 'Prof. Fernando Aquino',
    maxSlots: 40,
    enrolledCount: 27,
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
    schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 404' },
    instructor: 'Prof. Patricia Lagman',
    maxSlots: 40,
    enrolledCount: 30,
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
    schedule: { day: 'MWF', time: '3:00 PM - 4:30 PM', room: 'Room 405' },
    instructor: 'Prof. Gabriel Pascual',
    maxSlots: 40,
    enrolledCount: 25,
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
    schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: 'Room 501' },
    instructor: 'Prof. Teresa Castillo',
    maxSlots: 40,
    enrolledCount: 36,
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
    schedule: { day: 'TTH', time: '10:00 AM - 11:30 AM', room: 'Room 502' },
    instructor: 'Prof. Rosario Dizon',
    maxSlots: 40,
    enrolledCount: 34,
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
    schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 503' },
    instructor: 'Prof. Josefina Manalo',
    maxSlots: 40,
    enrolledCount: 38,
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
    schedule: { day: 'TTH', time: '8:00 AM - 9:30 AM', room: 'Room 504' },
    instructor: 'Prof. Alberto Evangelista',
    maxSlots: 40,
    enrolledCount: 27,
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
    schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 505' },
    instructor: 'Prof. Carmela Salazar',
    maxSlots: 40,
    enrolledCount: 30,
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
    schedule: { day: 'TTH', time: '3:00 PM - 4:30 PM', room: 'Room 506' },
    instructor: 'Prof. Roberto Santiago',
    maxSlots: 40,
    enrolledCount: 26,
    fee: 4500,
  },
];

// ---------------------------------------------------------------------------
// 4. REQUIRED DOCUMENTS
// ---------------------------------------------------------------------------
export const REQUIRED_DOCUMENTS = [
  { id: 'form-138', label: 'Form 138 (Report Card)', requiredFor: ['new'] },
  { id: 'form-137', label: 'Form 137 / Transcript of Records', requiredFor: ['new', 'transfer'] },
  { id: 'birth-cert', label: 'PSA Birth Certificate', requiredFor: ['new', 'transfer'] },
  { id: 'transfer-credentials', label: 'Certificate of Transfer Credentials', requiredFor: ['transfer'] },
  { id: 'readmission-form', label: 'Re-admission Form', requiredFor: ['returning'] },
  { id: 'good-moral', label: 'Certificate of Good Moral Character', optionalFor: ['new', 'transfer'] },
  { id: '2x2-photo', label: '2x2 ID Photo', optionalFor: ['new', 'transfer', 'returning'] },
  { id: 'med-cert', label: 'Medical Certificate', optionalFor: ['new', 'transfer', 'returning'] },
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
