import Student from '../Student.js';
import User from '../User.js';

async function findUniqueStudent(filter, session, includeDeleted) {
  const matches = await Student.find({
    ...filter,
    ...(includeDeleted ? {} : { isDeleted: { $ne: true } }),
  })
    .select('_id studentId schoolEmail email isDeleted')
    .limit(2)
    .session(session || null);
  return matches.length === 1 ? matches[0] : null;
}

export async function resolveStudentProfileForUser(user, { persist = true, session = null, includeDeleted = false } = {}) {
  if (!user || user.role !== 'student') return null;

  if (user.studentProfile) {
    const linked = await Student.findOne({
      _id: user.studentProfile,
      ...(includeDeleted ? {} : { isDeleted: { $ne: true } }),
    }).select('_id studentId schoolEmail email isDeleted').session(session || null);
    if (linked) return linked;
  }

  const username = String(user.username || '').trim();
  let student = username
    ? await Student.findOne({
        $or: [{ _id: username }, { studentId: username }],
        ...(includeDeleted ? {} : { isDeleted: { $ne: true } }),
      }).select('_id studentId schoolEmail email isDeleted').session(session || null)
    : null;

  const email = String(user.email || '').trim().toLowerCase();
  if (!student && email) student = await findUniqueStudent({ schoolEmail: email }, session, includeDeleted);
  if (!student && email) student = await findUniqueStudent({ email }, session, includeDeleted);
  if (!student) return null;

  if (persist && String(user.studentProfile || '') !== String(student._id)) {
    await User.updateOne(
      { _id: user._id, role: 'student' },
      { $set: { studentProfile: student._id } },
      { session: session || undefined }
    );
    user.studentProfile = student._id;
  }

  return student;
}

export function getStudentProfileIdentifier(student) {
  return student?.studentId || student?._id || null;
}
