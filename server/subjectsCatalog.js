// Server-side mirror of the subject catalog & misc fees defined in
// src/data/mockData.js. Only the fields needed to compute tuition are kept
// here. If subjects/fees are ever changed on the frontend, mirror the change
// here too so tuition assessments stay consistent.

import Subject from './models/Subject.js';

const INITIAL_SUBJECTS_CATALOG = [
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
      { id: 'cs101-a', code: 'CS 101-A', schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: 'Room 301' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 40 }, // FULL
      { id: 'cs101-b', code: 'CS 101-B', schedule: { day: 'TTH', time: '9:00 AM - 10:30 AM', room: 'Room 302' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 20 }
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
      { id: 'cs102-a', code: 'CS 102-A', schedule: { day: 'TTH', time: '10:00 AM - 11:30 AM', room: 'Room 302' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 37 },
      { id: 'cs102-b', code: 'CS 102-B', schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 301' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 15 }
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
      { id: 'cs201-a', code: 'CS 201-A', schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 303' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 29 },
      { id: 'cs201-b', code: 'CS 201-B', schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 304' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 10 }
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
      { id: 'cs202-a', code: 'CS 202-A', schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 304' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 31 },
      { id: 'cs202-b', code: 'CS 202-B', schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 303' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 12 }
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
      { id: 'cs301-a', code: 'CS 301-A', schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 305' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 26 },
      { id: 'cs301-b', code: 'CS 301-B', schedule: { day: 'TTH', time: '3:00 PM - 4:30 PM', room: 'Room 306' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 8 }
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
      { id: 'cs302-a', code: 'CS 302-A', schedule: { day: 'TTH', time: '8:00 AM - 9:30 AM', room: 'Room 306' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 28 },
      { id: 'cs302-b', code: 'CS 302-B', schedule: { day: 'MWF', time: '3:00 PM - 4:30 PM', room: 'Room 305' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 14 }
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
      { id: 'ba101-a', code: 'BA 101-A', schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: 'Room 401' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 35 },
      { id: 'ba101-b', code: 'BA 101-B', schedule: { day: 'TTH', time: '9:00 AM - 10:30 AM', room: 'Room 402' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 12 }
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
      { id: 'ba102-a', code: 'BA 102-A', schedule: { day: 'TTH', time: '10:00 AM - 11:30 AM', room: 'Room 402' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 32 },
      { id: 'ba102-b', code: 'BA 102-B', schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 401' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 15 }
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
      { id: 'ba201-a', code: 'BA 201-A', schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 403' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 27 },
      { id: 'ba201-b', code: 'BA 201-B', schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 404' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 8 }
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
      { id: 'ba202-a', code: 'BA 202-A', schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 404' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 30 },
      { id: 'ba202-b', code: 'BA 202-B', schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 403' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 11 }
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
      { id: 'ba301-a', code: 'BA 301-A', schedule: { day: 'MWF', time: '3:00 PM - 4:30 PM', room: 'Room 405' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 25 },
      { id: 'ba301-b', code: 'BA 301-B', schedule: { day: 'TTH', time: '3:00 PM - 4:30 PM', room: 'Room 406' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 9 }
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
      { id: 'nu101-a', code: 'NU 101-A', schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: 'Room 501' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 36 },
      { id: 'nu101-b', code: 'NU 101-B', schedule: { day: 'TTH', time: '9:00 AM - 10:30 AM', room: 'Room 502' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 15 }
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
      { id: 'nu102-a', code: 'NU 102-A', schedule: { day: 'TTH', time: '10:00 AM - 11:30 AM', room: 'Room 502' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 34 },
      { id: 'nu102-b', code: 'NU 102-B', schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 501' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 18 }
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
      { id: 'nu103-a', code: 'NU 103-A', schedule: { day: 'MWF', time: '10:00 AM - 11:30 AM', room: 'Room 503' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 38 },
      { id: 'nu103-b', code: 'NU 103-B', schedule: { day: 'TTH', time: '1:00 PM - 2:30 PM', room: 'Room 504' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 10 }
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
      { id: 'nu201-a', code: 'NU 201-A', schedule: { day: 'TTH', time: '8:00 AM - 9:30 AM', room: 'Room 504' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 27 },
      { id: 'nu201-b', code: 'NU 201-B', schedule: { day: 'MWF', time: '3:00 PM - 4:30 PM', room: 'Room 503' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 12 }
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
      { id: 'nu202-a', code: 'NU 202-A', schedule: { day: 'MWF', time: '1:00 PM - 2:30 PM', room: 'Room 505' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 30 },
      { id: 'nu202-b', code: 'NU 202-B', schedule: { day: 'TTH', time: '3:00 PM - 4:30 PM', room: 'Room 506' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 14 }
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
      { id: 'nu301-a', code: 'NU 301-A', schedule: { day: 'TTH', time: '3:00 PM - 4:30 PM', room: 'Room 506' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 26 },
      { id: 'nu301-b', code: 'NU 301-B', schedule: { day: 'MWF', time: '8:00 AM - 9:30 AM', room: 'Room 505' }, instructor: 'TBA', maxSlots: 40, enrolledCount: 8 }
    ],
    fee: 4500,
  },

  // ── General Electives Pool ─────────────────────────────────────────────────
  // programId = 'elective' so getCurriculumSubjects includes them for ALL programs
  {
    id: 'ge101',
    code: 'GE 101',
    name: 'Communication Skills',
    units: 3,
    programId: 'elective',
    yearLevel: null,
    semester: null,
    prerequisites: [],
    sections: [
      { id: 'ge101-a', code: 'GE 101-A', schedule: { day: 'MWF', time: '7:00 AM - 8:30 AM', room: 'Room 201' }, instructor: 'TBA', maxSlots: 45, enrolledCount: 20 },
      { id: 'ge101-b', code: 'GE 101-B', schedule: { day: 'TTH', time: '7:00 AM - 8:30 AM', room: 'Room 202' }, instructor: 'TBA', maxSlots: 45, enrolledCount: 15 },
    ],
    fee: 3000,
  },
  {
    id: 'ge102',
    code: 'GE 102',
    name: 'Philippine History and Culture',
    units: 3,
    programId: 'elective',
    yearLevel: null,
    semester: null,
    prerequisites: [],
    sections: [
      { id: 'ge102-a', code: 'GE 102-A', schedule: { day: 'TTH', time: '4:30 PM - 6:00 PM', room: 'Room 203' }, instructor: 'TBA', maxSlots: 45, enrolledCount: 10 },
      { id: 'ge102-b', code: 'GE 102-B', schedule: { day: 'MWF', time: '4:30 PM - 6:00 PM', room: 'Room 204' }, instructor: 'TBA', maxSlots: 45, enrolledCount: 22 },
    ],
    fee: 3000,
  },
  {
    id: 'ge103',
    code: 'GE 103',
    name: 'Ethics and Values Education',
    units: 3,
    programId: 'elective',
    yearLevel: null,
    semester: null,
    prerequisites: [],
    sections: [
      { id: 'ge103-a', code: 'GE 103-A', schedule: { day: 'MWF', time: '11:30 AM - 1:00 PM', room: 'Room 205' }, instructor: 'TBA', maxSlots: 45, enrolledCount: 30 },
      { id: 'ge103-b', code: 'GE 103-B', schedule: { day: 'TTH', time: '11:30 AM - 1:00 PM', room: 'Room 206' }, instructor: 'TBA', maxSlots: 45, enrolledCount: 18 },
    ],
    fee: 3000,
  },
  {
    id: 'ge104',
    code: 'GE 104',
    name: 'Mathematics in the Modern World',
    units: 3,
    programId: 'elective',
    yearLevel: null,
    semester: null,
    prerequisites: [],
    sections: [
      { id: 'ge104-a', code: 'GE 104-A', schedule: { day: 'TTH', time: '2:30 PM - 4:00 PM', room: 'Room 207' }, instructor: 'TBA', maxSlots: 45, enrolledCount: 25 },
      { id: 'ge104-b', code: 'GE 104-B', schedule: { day: 'MWF', time: '2:30 PM - 4:00 PM', room: 'Room 208' }, instructor: 'TBA', maxSlots: 45, enrolledCount: 12 },
    ],
    fee: 3000,
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

export let SUBJECTS_CATALOG = [...INITIAL_SUBJECTS_CATALOG];

export async function initCatalog() {
  try {
    const count = await Subject.countDocuments();
    if (count === 0) {
      console.log('Seeding initial subjects catalog to MongoDB...');
      await Subject.insertMany(INITIAL_SUBJECTS_CATALOG);
    }
    
    // Load from DB into memory with guaranteed id property
    const subjectsFromDb = await Subject.find().lean();
    if (subjectsFromDb.length > 0) {
      SUBJECTS_CATALOG = subjectsFromDb.map((s) => {
        const initial = INITIAL_SUBJECTS_CATALOG.find(i => i.id === s.id);
        return {
          ...s,
          sections: initial?.sections || [],
          id: s.id || s._id?.toString() || s.code?.toLowerCase().replace(/\s+/g, ''),
        };
      });
    }
    console.log(`Loaded ${SUBJECTS_CATALOG.length} subjects into memory cache.`);
  } catch (err) {
    console.error('Failed to initialize subjects catalog:', err);
  }
}

export function addSubjectToCache(subject) {
  SUBJECTS_CATALOG.push(subject);
}

export function updateSubjectInCache(subjectId, updatedData) {
  const index = SUBJECTS_CATALOG.findIndex((s) => s.id === subjectId);
  if (index !== -1) {
    SUBJECTS_CATALOG[index] = { ...SUBJECTS_CATALOG[index], ...updatedData };
  }
}
