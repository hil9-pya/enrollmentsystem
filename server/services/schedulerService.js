// ============================================================================
// schedulerService.js — Core business logic for the Course Scheduler
// All conflict checking, validation, and schedule persistence live here.
// Route handlers stay thin and call these functions.
// ============================================================================

import Section from '../models/Section.js';
import { SUBJECTS_CATALOG } from '../subjectsCatalog.js';

// ---------------------------------------------------------------------------
// Time parsing helpers
// ---------------------------------------------------------------------------

/**
 * Convert a time string like "8:00 AM" to total minutes since midnight.
 */
function parseTime(timeStr) {
  if (!timeStr) return 0;
  const [time, period] = timeStr.trim().split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Expand a day-string (e.g. "MWF", "TTH", "MTWTHF") into an array of
 * single-letter day codes: ["M","W","F"] etc.
 */
function expandDays(dayStr) {
  if (!dayStr) return [];
  const s = dayStr.toUpperCase().replace(/\s/g, '');
  const days = [];
  // Order matters — match "TH" before "T"
  const tokens = ['TH', 'M', 'T', 'W', 'F', 'S'];
  let i = 0;
  while (i < s.length) {
    let matched = false;
    for (const tok of tokens) {
      if (s.startsWith(tok, i)) {
        days.push(tok);
        i += tok.length;
        matched = true;
        break;
      }
    }
    if (!matched) i++;
  }
  return days;
}

/**
 * Check if two section schedules overlap.
 * @param {object} schedA  { day, time } e.g. { day: 'MWF', time: '8:00 AM - 9:30 AM' }
 * @param {object} schedB
 * @returns {boolean}
 */
function schedulesOverlap(schedA, schedB) {
  const daysA = expandDays(schedA.day);
  const daysB = expandDays(schedB.day);
  const sharedDays = daysA.filter((d) => daysB.includes(d));
  if (sharedDays.length === 0) return false;

  const [startA, endA] = schedA.time.split('-').map((t) => parseTime(t.trim()));
  const [startB, endB] = schedB.time.split('-').map((t) => parseTime(t.trim()));

  return startA < endB && startB < endA;
}

// ---------------------------------------------------------------------------
// Subject catalog helpers
// ---------------------------------------------------------------------------

const MAX_UNITS = 21; // absolute ceiling — adviser permit needed above 18

/**
 * Get all subjects from the static catalog that belong to a given program,
 * year level, and semester. Also includes elective subjects.
 */
export function getCurriculumSubjects(programId, yearLevel, semesterNum) {
  return SUBJECTS_CATALOG.filter(
    (s) =>
      (s.programId === programId || s.programId === 'elective') &&
      (s.programId === 'elective' || s.yearLevel === yearLevel) &&
      (s.programId === 'elective' || s.semester === semesterNum)
  );
}

/**
 * Determine if all prerequisites for a subject are in the passed subjects list.
 */
export function prereqsMet(subjectId, passedSubjectIds = []) {
  const sub = SUBJECTS_CATALOG.find((s) => s.id === subjectId);
  if (!sub || !sub.prerequisites || sub.prerequisites.length === 0) return true;
  return sub.prerequisites.every((prereqId) => passedSubjectIds.includes(prereqId));
}

// ---------------------------------------------------------------------------
// Live section data (with live enrolledCount from MongoDB)
// ---------------------------------------------------------------------------

/**
 * Enrich a static subject's sections with live slot data from the DB.
 * Also appends any admin-created sections that exist ONLY in MongoDB (not
 * in the static catalog). This ensures newly created sections always appear
 * in the student portal.
 */
export async function enrichSubjectWithLiveSections(subject) {
  const liveSections = await Section.find({ subjectId: subject.id, isActive: { $ne: false } }).lean();
  const liveMap = new Map(liveSections.map((s) => [s.sectionCode, s]));

  // Once admin creates live sections, those are the schedule source of truth.
  // Do not show legacy static sections beside the premade live schedule.
  if (liveSections.length > 0) {
    return {
      ...subject,
      sections: liveSections.map((live) => ({
        id: live._id.toString(),
        code: live.sectionCode,
        instructor: live.instructor || '',
        maxSlots: live.maxSlots ?? 40,
        enrolledCount: live.enrolledCount ?? 0,
        schedule: {
          day: live.days,
          time: live.time,
          room: live.room || '',
        },
      })),
    };
  }

  // Track which live sectionCodes were matched to a static entry
  const matchedLiveCodes = new Set();

  const staticMapped = (subject.sections || []).map((staticSec) => {
    const live = liveMap.get(staticSec.code);
    if (live) {
      matchedLiveCodes.add(live.sectionCode);
      return {
        ...staticSec,
        // Prefer the MongoDB _id so the frontend always stores a DB-backed id.
        id: live._id.toString(),
        enrolledCount: live.enrolledCount,
        maxSlots: live.maxSlots ?? staticSec.maxSlots,
        instructor: live.instructor ?? staticSec.instructor,
        room: live.room ?? staticSec.schedule?.room ?? staticSec.room,
        schedule: {
          day: live.days ?? staticSec.schedule?.day,
          time: live.time ?? staticSec.schedule?.time,
          room: live.room ?? staticSec.schedule?.room,
        },
      };
    }
    // Static section has no live DB record — keep as-is
    return staticSec;
  });

  // Append any live (admin-created) sections not in the static catalog
  const dbOnlySections = liveSections
    .filter((live) => !matchedLiveCodes.has(live.sectionCode))
    .map((live) => ({
      id: live._id.toString(),
      code: live.sectionCode,
      instructor: live.instructor || '',
      maxSlots: live.maxSlots ?? 40,
      enrolledCount: live.enrolledCount ?? 0,
      schedule: {
        day: live.days,
        time: live.time,
        room: live.room || '',
      },
    }));

  return { ...subject, sections: [...staticMapped, ...dbOnlySections] };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate adding a new section to a student's in-progress schedule.
 * @param {Array} currentSections  Array of { subjectId, sectionId, schedule }
 * @param {string} newSubjectId
 * @param {string} newSectionId
 * @param {number} currentUnits
 * @param {boolean} hasOverloadPermit
 * @returns {{ valid: boolean, error?: string }}
 */
/**
 * Resolve a section by either a static catalog id (e.g. "cs101-a") or a
 * MongoDB ObjectId string. Returns { staticSection, liveSection, schedule }.
 */
async function resolveSection(subjectId, sectionId) {
  const subject = SUBJECTS_CATALOG.find((s) => s.id === subjectId || s.code?.toLowerCase().replace(/\s+/g, '') === subjectId?.toLowerCase().replace(/\s+/g, ''));
  if (!subject) return null;

  // 1. Try static catalog matching by id or code
  let staticSection = (subject.sections || []).find((s) => s.id === sectionId || s.code === sectionId || s.code?.toLowerCase() === sectionId?.toLowerCase());
  let liveSection = null;

  if (staticSection) {
    liveSection = await Section.findOne({ subjectId: subject.id, sectionCode: staticSection.code }).lean();
    if (!liveSection) {
      const hasLiveSchedule = await Section.exists({
        subjectId: subject.id,
        isActive: { $ne: false },
      });
      if (hasLiveSchedule) return null;
    }
  } else {
    // 2. Try MongoDB Section collection by _id or sectionCode
    liveSection = await Section.findOne({
      subjectId: subject.id,
      sectionCode: sectionId,
    }).lean();

    if (!liveSection) {
      try {
        liveSection = await Section.findById(sectionId).lean();
      } catch {
        // sectionId is not a MongoDB ObjectId
      }
    }

    if (liveSection) {
      staticSection = (subject.sections || []).find((s) => s.code === liveSection.sectionCode) || {
        id: liveSection._id.toString(),
        code: liveSection.sectionCode,
        schedule: { day: liveSection.days, time: liveSection.time, room: liveSection.room },
        instructor: liveSection.instructor,
        maxSlots: liveSection.maxSlots,
        enrolledCount: liveSection.enrolledCount,
      };
    } else {
      return null;
    }
  }

  const schedule = liveSection
    ? { day: liveSection.days, time: liveSection.time, room: liveSection.room }
    : staticSection.schedule || { day: 'TBA', time: 'TBA' };

  return { subject, staticSection, liveSection, schedule };
}

/**
 * Resolve only sections saved on a student's enrollment record.
 * This prevents document generation from guessing a section when IDs no
 * longer match the current curriculum response.
 */
export async function getResolvedEnrolledSchedule(selectedSubjects = []) {
  const rows = await Promise.all(
    selectedSubjects.map(async ({ subjectId, sectionId }) => {
      const resolved = await resolveSection(subjectId, sectionId);
      if (!resolved) return null;

      const { subject, staticSection, liveSection, schedule } = resolved;
      const sectionCode = liveSection?.sectionCode || staticSection?.code || sectionId;

      return {
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.name,
        units: subject.units,
        sectionId,
        sectionDatabaseId: liveSection?._id || null,
        sectionCode,
        schedule: {
          day: schedule?.day || 'TBA',
          time: schedule?.time || 'TBA',
          room: schedule?.room || liveSection?.room || staticSection?.room || 'TBA',
        },
        instructor: liveSection?.instructor || staticSection?.instructor || 'TBA',
        instructorUserId: liveSection?.instructorUser || null,
        maxSlots: liveSection?.maxSlots || staticSection?.maxSlots || 40,
      };
    })
  );

  return rows.filter(Boolean);
}

export async function validateAddSection(
  currentSections,
  newSubjectId,
  newSectionId,
  currentUnits,
  hasOverloadPermit = false
) {
  // 1. Duplicate subject check
  if (currentSections.some((s) => s.subjectId === newSubjectId)) {
    return { valid: false, error: 'You have already selected a section for this subject.' };
  }

  // 2. Resolve section from static catalog or live DB
  const resolved = await resolveSection(newSubjectId, newSectionId);
  if (!resolved) return { valid: false, error: 'Section not found.' };
  const { subject, staticSection, liveSection, schedule: newSched } = resolved;

  // 3. Capacity check
  const enrolledCount = liveSection ? liveSection.enrolledCount : (staticSection.enrolledCount ?? 0);
  const maxSlots = liveSection ? (liveSection.maxSlots ?? staticSection.maxSlots) : (staticSection.maxSlots ?? 40);
  const remaining = maxSlots - enrolledCount;
  if (remaining <= 0) {
    return { valid: false, error: `Section ${staticSection.code} is full (0 slots remaining).` };
  }

  // 4. Unit limit check
  const newTotalUnits = currentUnits + subject.units;
  if (newTotalUnits > MAX_UNITS) {
    return {
      valid: false,
      error: `Adding ${subject.code} would bring your total to ${newTotalUnits} units, exceeding the maximum of ${MAX_UNITS}.`,
    };
  }
  if (newTotalUnits > 18 && !hasOverloadPermit) {
    return {
      valid: false,
      error: `Adding ${subject.code} would exceed the standard 18-unit limit. An overload permit is required.`,
    };
  }

  // 5. Schedule conflict check against existing selections
  for (const existing of currentSections) {
    const existingResolved = await resolveSection(existing.subjectId, existing.sectionId);
    if (!existingResolved) continue;
    const existingSched = existingResolved.schedule;
    if (!existingSched?.day || !existingSched?.time) continue;

    if (schedulesOverlap(newSched, existingSched)) {
      return {
        valid: false,
        error: `Schedule conflict: ${staticSection.code} (${newSched.day} ${newSched.time}) overlaps with ${existingResolved.staticSection.code} (${existingSched.day} ${existingSched.time}).`,
      };
    }
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Admin: Section management validation
// ---------------------------------------------------------------------------

/**
 * Check for room or instructor conflicts when creating/updating a section
 * (admin only). Compares against all live sections stored in MongoDB.
 *
 * @param {object} sectionData  { subjectId, sectionCode, days, time, room, instructor }
 * @param {string|null} excludeId  Mongo _id to exclude (for edit operations)
 * @returns {{ valid: boolean, error?: string }}
 */
export async function validateSectionConflict(sectionData, excludeId = null) {
  const { days, time, room, instructor } = sectionData;
  const newSched = { day: days, time };

  const query = excludeId ? { _id: { $ne: excludeId } } : {};
  const allSections = await Section.find(query).lean();

  for (const sec of allSections) {
    const existingSched = { day: sec.days, time: sec.time };
    if (!schedulesOverlap(newSched, existingSched)) continue;

    if (room && sec.room && room.toLowerCase() === sec.room.toLowerCase()) {
      return {
        valid: false,
        error: `Room conflict: ${room} is already booked for ${sec.subjectId} (${sec.sectionCode}) at ${sec.days} ${sec.time}.`,
      };
    }

    if (instructor && sec.instructor && instructor.toLowerCase() === sec.instructor.toLowerCase()) {
      return {
        valid: false,
        error: `Instructor conflict: ${instructor} is already assigned to ${sec.subjectId} (${sec.sectionCode}) at ${sec.days} ${sec.time}.`,
      };
    }
  }

  return { valid: true };
}
