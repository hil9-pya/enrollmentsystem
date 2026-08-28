import dotenv from 'dotenv';
import mongoose from 'mongoose';

import User from '../User.js';
import Section from '../models/Section.js';
import Subject from '../models/Subject.js';
import { initCatalog } from '../subjectsCatalog.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const APPLY_FLAG = '--apply';
const DEFAULT_PASSWORD = 'NCST2026!';

const INSTRUCTORS = [
  {
    key: 'santos',
    username: 'instructor.cs.santos',
    email: 'marco.santos@ncst.edu.ph',
    firstName: 'Marco',
    lastName: 'Santos',
  },
  {
    key: 'reyes',
    username: 'instructor.cs.reyes',
    email: 'elaine.reyes@ncst.edu.ph',
    firstName: 'Elaine',
    lastName: 'Reyes',
  },
];

const SECTION_PLANS = [
  { subjectId: 'cs103', sectionCode: 'CS-12M1', days: 'MWF', time: '8:00 AM - 9:00 AM', room: 'Computer Lab 321', instructorKey: 'santos' },
  { subjectId: 'cs104', sectionCode: 'CS-12A2', days: 'TTH', time: '8:00 AM - 9:30 AM', room: 'Computer Lab 322', instructorKey: 'reyes' },
  { subjectId: 'cs203', sectionCode: 'CS-22M1', days: 'MWF', time: '9:00 AM - 10:00 AM', room: 'Computer Lab 323', instructorKey: 'santos' },
  { subjectId: 'cs204', sectionCode: 'CS-22A2', days: 'TTH', time: '9:30 AM - 11:00 AM', room: 'Computer Lab 324', instructorKey: 'reyes' },
  { subjectId: 'cs303', sectionCode: 'CS-32M1', days: 'MWF', time: '10:00 AM - 11:00 AM', room: 'Computer Lab 325', instructorKey: 'santos' },
  { subjectId: 'cs304', sectionCode: 'CS-32A2', days: 'TTH', time: '11:00 AM - 12:30 PM', room: 'Computer Lab 326', instructorKey: 'reyes' },
];

async function ensureInstructor(profile) {
  const byUsername = await User.findOne({ username: profile.username });
  const byEmail = await User.findOne({ email: profile.email });

  if (byUsername && byEmail && String(byUsername._id) !== String(byEmail._id)) {
    throw new Error(`Username/email collision for ${profile.username}.`);
  }

  const existing = byUsername || byEmail;
  if (existing) {
    if (existing.role !== 'instructor') {
      throw new Error(`${profile.username} already belongs to a non-instructor account.`);
    }
    return { user: existing, created: false };
  }

  const user = await User.create({
    username: profile.username,
    email: profile.email,
    password: DEFAULT_PASSWORD,
    firstName: profile.firstName,
    lastName: profile.lastName,
    role: 'instructor',
  });
  return { user, created: true };
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');
  if (!process.argv.includes(APPLY_FLAG)) {
    throw new Error(`Refusing to write without ${APPLY_FLAG}.`);
  }

  await mongoose.connect(process.env.MONGO_URI);
  await initCatalog();

  const requiredSubjectIds = SECTION_PLANS.map((plan) => plan.subjectId);
  const subjects = await Subject.find({ id: { $in: requiredSubjectIds }, programId: 'bscs', semester: 2 }).lean();
  const foundSubjectIds = new Set(subjects.map((subject) => subject.id));
  const missingSubjectIds = requiredSubjectIds.filter((subjectId) => !foundSubjectIds.has(subjectId));
  if (missingSubjectIds.length > 0) {
    throw new Error(`Missing persistent CS second-semester subjects: ${missingSubjectIds.join(', ')}`);
  }

  const instructorByKey = new Map();
  let instructorsCreated = 0;
  for (const profile of INSTRUCTORS) {
    const result = await ensureInstructor(profile);
    instructorByKey.set(profile.key, result.user);
    if (result.created) instructorsCreated += 1;
  }

  let sectionsCreated = 0;
  let sectionsExisting = 0;
  for (const plan of SECTION_PLANS) {
    const instructor = instructorByKey.get(plan.instructorKey);
    const result = await Section.updateOne(
      { subjectId: plan.subjectId, sectionCode: plan.sectionCode },
      {
        $setOnInsert: {
          days: plan.days,
          time: plan.time,
          room: plan.room,
          instructor: `${instructor.firstName} ${instructor.lastName}`,
          instructorUser: instructor._id,
          maxSlots: 40,
          enrolledCount: 0,
          enrolledStudentIds: [],
          isActive: true,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) sectionsCreated += 1;
    else sectionsExisting += 1;
  }

  const verifiedSections = await Section.find({
    $or: SECTION_PLANS.map(({ subjectId, sectionCode }) => ({ subjectId, sectionCode })),
  }).select('subjectId sectionCode days time room instructor maxSlots isActive').lean();

  console.log(JSON.stringify({
    database: 'persistent',
    instructorsCreated,
    instructorsExisting: INSTRUCTORS.length - instructorsCreated,
    sectionsCreated,
    sectionsExisting,
    verifiedSectionCount: verifiedSections.length,
    instructorUsernames: INSTRUCTORS.map((profile) => profile.username),
    sectionCodes: verifiedSections.map((section) => `${section.subjectId}:${section.sectionCode}`),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
