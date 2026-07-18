// Server-side mirror of the subject catalog & misc fees defined in
// src/data/mockData.js. Only the fields needed to compute tuition are kept
// here. If subjects/fees are ever changed on the frontend, mirror the change
// here too so tuition assessments stay consistent.

export const SUBJECTS_CATALOG = [
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

export const MISC_FEES = [
  { label: 'Library Fee', amount: 1500 },
  { label: 'Laboratory Fee', amount: 2500 },
  { label: 'Athletic Fee', amount: 800 },
  { label: 'Student Activity Fee', amount: 1200 },
  { label: 'Technology Fee', amount: 2000 },
  { label: 'Registration Fee', amount: 500 },
];

export function getSubjectById(id) {
  return SUBJECTS_CATALOG.find((s) => s.id === id) || null;
}

// Builds the { tuitionBreakdown, totalTuition } pair for a given list of
// subjectIds, matching the shape the frontend expects on the student record.
export function computeTuition(subjectIds = []) {
  const subjectLines = subjectIds
    .map((id) => getSubjectById(id))
    .filter(Boolean)
    .map((sub) => ({ label: `${sub.code} - ${sub.name}`, amount: sub.fee }));

  const tuitionBreakdown =
    subjectLines.length > 0 ? [...subjectLines, ...MISC_FEES] : [];

  const totalTuition = tuitionBreakdown.reduce((sum, item) => sum + item.amount, 0);

  return { tuitionBreakdown, totalTuition };
}
