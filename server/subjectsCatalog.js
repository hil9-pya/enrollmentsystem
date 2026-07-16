// Server-side mirror of the subject catalog & misc fees defined in
// src/data/mockData.js. Only the fields needed to compute tuition are kept
// here. If subjects/fees are ever changed on the frontend, mirror the change
// here too so tuition assessments stay consistent.

export const SUBJECTS_CATALOG = [
  { id: 'cs101', code: 'CS 101', name: 'Intro to Computing', fee: 4500, yearLevel: 1, prerequisites: [] },
  { id: 'cs102', code: 'CS 102', name: 'Programming 1', fee: 4500, yearLevel: 1, prerequisites: ['cs101'] },
  { id: 'cs201', code: 'CS 201', name: 'Data Structures', fee: 4500, yearLevel: 2, prerequisites: ['cs102'] },
  { id: 'cs202', code: 'CS 202', name: 'Object-Oriented Programming', fee: 4500, yearLevel: 2, prerequisites: ['cs102'] },
  { id: 'cs301', code: 'CS 301', name: 'Algorithms', fee: 4500, yearLevel: 3, prerequisites: ['cs201'] },
  { id: 'cs302', code: 'CS 302', name: 'Database Systems', fee: 4500, yearLevel: 3, prerequisites: ['cs201'] },
  { id: 'ba101', code: 'BA 101', name: 'Intro to Business', fee: 4500, yearLevel: 1, prerequisites: [] },
  { id: 'ba102', code: 'BA 102', name: 'Accounting Fundamentals', fee: 4500, yearLevel: 1, prerequisites: ['ba101'] },
  { id: 'ba201', code: 'BA 201', name: 'Principles of Marketing', fee: 4500, yearLevel: 2, prerequisites: ['ba101'] },
  { id: 'ba202', code: 'BA 202', name: 'Corporate Finance', fee: 4500, yearLevel: 2, prerequisites: ['ba102'] },
  { id: 'ba301', code: 'BA 301', name: 'Strategic Management', fee: 4500, yearLevel: 3, prerequisites: ['ba201', 'ba202'] },
  { id: 'nu101', code: 'NU 101', name: 'Anatomy and Physiology', fee: 4500, yearLevel: 1, prerequisites: [] },
  { id: 'nu102', code: 'NU 102', name: 'Fundamentals of Nursing', fee: 4500, yearLevel: 1, prerequisites: ['nu101'] },
  { id: 'nu103', code: 'NU 103', name: 'Health Assessment', fee: 4500, yearLevel: 1, prerequisites: ['nu101'] },
  { id: 'nu201', code: 'NU 201', name: 'Pharmacology', fee: 4500, yearLevel: 2, prerequisites: ['nu102'] },
  { id: 'nu202', code: 'NU 202', name: 'Medical-Surgical Nursing', fee: 4500, yearLevel: 2, prerequisites: ['nu102'] },
  { id: 'nu301', code: 'NU 301', name: 'Community Health Nursing', fee: 4500, yearLevel: 3, prerequisites: ['nu202'] },
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
