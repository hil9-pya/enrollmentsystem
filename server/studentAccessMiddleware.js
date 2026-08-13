import jwt from 'jsonwebtoken';
import Student from './Student.js';
import User from './User.js';

const STAFF_ROLES = new Set(['admin', 'admission', 'adviser', 'accounting', 'registrar']);

export function generateApplicantToken(studentId) {
  return jwt.sign(
    { applicant: { id: String(studentId) } },
    process.env.JWT_SECRET,
    { expiresIn: process.env.APPLICANT_TOKEN_EXPIRES_IN || '12h' }
  );
}

export async function protectStudentRecord(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const requestedId = String(req.params.studentId || req.params.id || req.body.studentId || '');

    if (decoded.applicant?.id) {
      if (String(decoded.applicant.id) !== requestedId) {
        return res.status(403).json({ error: 'You cannot access another application.' });
      }
      req.applicantId = String(decoded.applicant.id);
      return next();
    }

    if (!decoded.user?.id) return res.status(401).json({ error: 'Invalid authentication token.' });
    const user = await User.findById(decoded.user.id).select('-password');
    if (!user) return res.status(401).json({ error: 'User account not found.' });
    req.user = user;

    if (STAFF_ROLES.has(user.role)) return next();
    if (user.role !== 'student') {
      return res.status(403).json({ error: 'Your role cannot access student records.' });
    }

    const ownsRecord = await Student.exists({
      $and: [
        { $or: [{ _id: requestedId }, { studentId: requestedId }] },
        { $or: [{ _id: user.username }, { studentId: user.username }] },
      ],
      isDeleted: { $ne: true },
    });
    if (!ownsRecord) return res.status(403).json({ error: 'You cannot access another student record.' });
    return next();
  } catch {
    return res.status(401).json({ error: 'Authentication token is invalid or expired.' });
  }
}
