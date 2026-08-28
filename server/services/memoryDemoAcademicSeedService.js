import bcrypt from 'bcryptjs';
import Section from '../models/Section.js';
import Student from '../Student.js';
import User from '../User.js';
import { SUBJECTS_CATALOG } from '../subjectsCatalog.js';

const DEMO_PASSWORD = 'password123';

const DEMO_APPLICANTS = [
  {
    _id: 'APP-2026-1001',
    firstName: 'Janelle',
    lastName: 'Bautista',
    email: 'new.applicant1@example.com',
    phone: '0917-100-1001',
    birthDate: '2007-02-14',
    address: 'Dasmarinas City, Cavite',
    enrollmentType: 'new',
    programId: 'bscs',
  },
  {
    _id: 'APP-2026-1002',
    firstName: 'Kevin',
    lastName: 'Morales',
    email: 'new.applicant2@example.com',
    phone: '0917-100-1002',
    birthDate: '2006-09-08',
    address: 'General Trias, Cavite',
    enrollmentType: 'new',
    programId: 'bsba',
  },
  {
    _id: 'APP-2026-1003',
    firstName: 'Sophia',
    lastName: 'Reyes',
    email: 'new.applicant3@example.com',
    phone: '0917-100-1003',
    birthDate: '2007-05-21',
    address: 'Imus City, Cavite',
    enrollmentType: 'new',
    programId: 'bsn',
  },
  {
    _id: 'APP-2026-1004',
    firstName: 'Mark',
    lastName: 'Villanueva',
    email: 'transfer.applicant1@example.com',
    phone: '0917-100-1004',
    birthDate: '2005-01-17',
    address: 'Silang, Cavite',
    enrollmentType: 'transfer',
    programId: 'bscs',
    previousSchool: 'Cavite State University',
    previousProgram: 'BS Information Technology',
    yearLevelAtTransfer: '2nd Year',
    reasonForTransfer: 'Relocation',
    unitsEarned: '30',
  },
  {
    _id: 'APP-2026-1005',
    firstName: 'Nicole',
    lastName: 'Garcia',
    email: 'transfer.applicant2@example.com',
    phone: '0917-100-1005',
    birthDate: '2004-11-03',
    address: 'Trece Martires City, Cavite',
    enrollmentType: 'transfer',
    programId: 'bsba',
    previousSchool: 'De La Salle University-Dasmarinas',
    previousProgram: 'BS Business Administration',
    yearLevelAtTransfer: '2nd Year',
    reasonForTransfer: 'Program availability',
    unitsEarned: '33',
  },
  {
    _id: 'APP-2026-1006',
    firstName: 'Ethan',
    lastName: 'Mendoza',
    email: 'transfer.applicant3@example.com',
    phone: '0917-100-1006',
    birthDate: '2005-07-26',
    address: 'Tagaytay City, Cavite',
    enrollmentType: 'transfer',
    programId: 'bsn',
    previousSchool: 'Emilio Aguinaldo College',
    previousProgram: 'BS Nursing',
    yearLevelAtTransfer: '2nd Year',
    reasonForTransfer: 'Relocation',
    unitsEarned: '28',
  },
];

const FACULTY_BY_PROGRAM = {
  bscs: [
    { username: 'instructor.cs.cruz', email: 'adrian.cruz@ncst.edu.ph', firstName: 'Adrian', lastName: 'Cruz' },
    { username: 'instructor.cs.lim', email: 'bianca.lim@ncst.edu.ph', firstName: 'Bianca', lastName: 'Lim' },
    { username: 'instructor.cs.mendoza', email: 'noel.mendoza@ncst.edu.ph', firstName: 'Noel', lastName: 'Mendoza' },
  ],
  bsba: [
    { username: 'instructor.ba.navarro', email: 'camille.navarro@ncst.edu.ph', firstName: 'Camille', lastName: 'Navarro' },
    { username: 'instructor.ba.villanueva', email: 'ramon.villanueva@ncst.edu.ph', firstName: 'Ramon', lastName: 'Villanueva' },
    { username: 'instructor.ba.ong', email: 'teresa.ong@ncst.edu.ph', firstName: 'Teresa', lastName: 'Ong' },
  ],
  bsn: [
    { username: 'instructor.nu.delacruz', email: 'angela.delacruz@ncst.edu.ph', firstName: 'Angela', lastName: 'Dela Cruz' },
    { username: 'instructor.nu.garcia', email: 'paolo.garcia@ncst.edu.ph', firstName: 'Paolo', lastName: 'Garcia' },
    { username: 'instructor.nu.flores', email: 'miriam.flores@ncst.edu.ph', firstName: 'Miriam', lastName: 'Flores' },
  ],
  elective: [
    { username: 'instructor.ge.aquino', email: 'liza.aquino@ncst.edu.ph', firstName: 'Liza', lastName: 'Aquino' },
    { username: 'instructor.ge.ramos', email: 'daniel.ramos@ncst.edu.ph', firstName: 'Daniel', lastName: 'Ramos' },
  ],
};

const PROGRAM_CODE = { bscs: 'CS', bsba: 'BA', bsn: 'NU', elective: 'GE' };
const ROOM_PREFIX = { bscs: 'Computer Lab', bsba: 'Business Room', bsn: 'Nursing Lab', elective: 'General Room' };
const REQUIRED_DOCUMENTS = {
  new: ['form-138', 'birth-cert', 'good-moral'],
  transfer: ['honorable-dismissal', 'tor', 'course-description', 'birth-cert', 'good-moral'],
};
const MORNING_SLOTS = [
  { days: 'MWF', time: '8:00 AM - 9:00 AM' },
  { days: 'MWF', time: '9:00 AM - 10:00 AM' },
  { days: 'TTH', time: '8:00 AM - 9:30 AM' },
  { days: 'TTH', time: '9:30 AM - 11:00 AM' },
  { days: 'MWF', time: '10:00 AM - 11:00 AM' },
  { days: 'TTH', time: '11:00 AM - 12:30 PM' },
];
const AFTERNOON_SLOTS = [
  { days: 'MWF', time: '1:00 PM - 2:00 PM' },
  { days: 'MWF', time: '2:00 PM - 3:00 PM' },
  { days: 'TTH', time: '1:00 PM - 2:30 PM' },
  { days: 'TTH', time: '2:30 PM - 4:00 PM' },
  { days: 'MWF', time: '3:00 PM - 4:00 PM' },
  { days: 'TTH', time: '4:00 PM - 5:30 PM' },
];

function buildSectionCode(subject, period, sectionNumber) {
  const year = subject.programId === 'elective' ? 1 : Number(subject.yearLevel);
  const semester = subject.programId === 'elective' ? 1 : Number(subject.semester);
  return `${PROGRAM_CODE[subject.programId]}-${year}${semester}${period}${sectionNumber}`;
}

async function seedInstructorAccounts() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const profiles = Object.values(FACULTY_BY_PROGRAM).flat();

  for (const profile of profiles) {
    await User.updateOne(
      { username: profile.username },
      {
        $setOnInsert: { password },
        $set: {
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: 'instructor',
        },
      },
      { upsert: true }
    );
  }

  const users = await User.find({ username: { $in: profiles.map((profile) => profile.username) } });
  return new Map(users.map((user) => [user.username, user]));
}

async function seedApplicantAccounts() {
  const applicantPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  const studentPortalPassword = await bcrypt.hash('NCST2026!', 10);

  for (const applicant of DEMO_APPLICANTS) {
    const safeFirst = applicant.firstName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const safeLast = applicant.lastName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const schoolEmail = `${safeFirst}.${safeLast}@ncst.edu`;
    const documents = REQUIRED_DOCUMENTS[applicant.enrollmentType].map((typeId) => ({
      typeId,
      fileName: `${applicant._id.toLowerCase()}-${typeId}.pdf`,
      originalName: `${typeId}-${applicant.lastName}.pdf`,
      status: 'approved',
    }));

    await Student.updateOne(
      { _id: applicant._id },
      {
        $set: {
          ...applicant,
          emailVerified: true,
          schoolEmail,
          acceptanceLetterSeen: true,
          status: applicant.enrollmentType === 'new' ? 'advising_approved' : 'advising_pending',
          documents,
          admissionNotes: 'Application form and admission documents approved for memory database testing.',
          isDeleted: false,
        },
        $setOnInsert: {
          applicantPassword,
          selectedSubjects: [],
          tuitionBreakdown: [],
        },
      },
      { upsert: true }
    );

    await User.updateOne(
      { username: applicant._id },
      {
        $set: {
          email: schoolEmail,
          firstName: applicant.firstName,
          lastName: applicant.lastName,
          role: 'student',
          studentProfile: applicant._id,
        },
        $setOnInsert: { password: studentPortalPassword },
      },
      { upsert: true }
    );
  }

  return DEMO_APPLICANTS.length;
}

async function remapLegacyDemoSelections(sectionIdByLegacyId) {
  const students = await Student.find({ 'selectedSubjects.0': { $exists: true } });
  let remappedSelections = 0;

  for (const student of students) {
    let changed = false;
    for (const selection of student.selectedSubjects) {
      const replacement = sectionIdByLegacyId.get(selection.sectionId);
      if (replacement && selection.sectionId !== replacement) {
        selection.sectionId = replacement;
        remappedSelections += 1;
        changed = true;
      }
    }
    if (changed) await student.save();
  }

  return remappedSelections;
}

export async function seedMemoryDemoAcademicData({ memoryDatabase = false } = {}) {
  if (!memoryDatabase) {
    return { skipped: true, applicants: 0, studentAccounts: 0, instructors: 0, sections: 0, remappedSelections: 0 };
  }

  const applicantCount = await seedApplicantAccounts();
  const instructorByUsername = await seedInstructorAccounts();
  const programSubjectIndex = new Map();
  const usedScheduleIndicesByInstructor = new Map();
  const usedScheduleIndicesByCohort = new Map();
  const sectionIdByLegacyId = new Map();
  let sectionCount = 0;

  for (const subject of SUBJECTS_CATALOG.filter((entry) => entry.isActive !== false)) {
    const faculty = FACULTY_BY_PROGRAM[subject.programId];
    if (!faculty) continue;

    const subjectIndex = programSubjectIndex.get(subject.programId) || 0;
    programSubjectIndex.set(subject.programId, subjectIndex + 1);
    const instructorProfile = faculty[subjectIndex % faculty.length];
    const instructor = instructorByUsername.get(instructorProfile.username);
    const instructorName = `${instructor.firstName} ${instructor.lastName}`;
    const cohortKey = `${subject.programId}:${subject.yearLevel || 'all'}:${subject.semester || 'all'}`;
    const instructorScheduleIndices = usedScheduleIndicesByInstructor.get(instructorProfile.username) || new Set();
    const cohortScheduleIndices = usedScheduleIndicesByCohort.get(cohortKey) || new Set();
    const scheduleIndex = MORNING_SLOTS.findIndex((_slot, index) => (
      !instructorScheduleIndices.has(index) && !cohortScheduleIndices.has(index)
    ));
    if (scheduleIndex < 0) {
      throw new Error(`Unable to assign a conflict-free demo schedule for ${subject.code}.`);
    }
    instructorScheduleIndices.add(scheduleIndex);
    cohortScheduleIndices.add(scheduleIndex);
    usedScheduleIndicesByInstructor.set(instructorProfile.username, instructorScheduleIndices);
    usedScheduleIndicesByCohort.set(cohortKey, cohortScheduleIndices);
    const schedules = [
      MORNING_SLOTS[scheduleIndex],
      AFTERNOON_SLOTS[scheduleIndex],
    ];

    for (let variantIndex = 0; variantIndex < schedules.length; variantIndex += 1) {
      const period = variantIndex === 0 ? 'M' : 'A';
      const sectionNumber = variantIndex + 1;
      const schedule = schedules[variantIndex];
      const sectionCode = buildSectionCode(subject, period, sectionNumber);
      const roomNumber = 201 + (subjectIndex * 2) + variantIndex;
      const section = await Section.findOneAndUpdate(
        { subjectId: subject.id, sectionCode },
        {
          $set: {
            days: schedule.days,
            time: schedule.time,
            room: `${ROOM_PREFIX[subject.programId]} ${roomNumber}`,
            instructor: instructorName,
            instructorUser: instructor._id,
            maxSlots: subject.programId === 'elective' ? 45 : 40,
            isActive: true,
          },
          $setOnInsert: { enrolledCount: 0, enrolledStudentIds: [] },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      const legacyId = subject.sections?.[variantIndex]?.id;
      if (legacyId) sectionIdByLegacyId.set(legacyId, section._id.toString());
      sectionCount += 1;
    }
  }

  const remappedSelections = await remapLegacyDemoSelections(sectionIdByLegacyId);
  return {
    skipped: false,
    applicants: applicantCount,
    studentAccounts: applicantCount,
    instructors: instructorByUsername.size,
    sections: sectionCount,
    remappedSelections,
  };
}
