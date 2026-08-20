import fs from 'node:fs/promises';
import path from 'node:path';
import asyncHandler from 'express-async-handler';
import CourseMembership from './models/CourseMembership.js';
import CourseOffering from './models/CourseOffering.js';
import LmsAnnouncement from './models/LmsAnnouncement.js';
import LmsMaterial from './models/LmsMaterial.js';
import LmsAssignment from './models/LmsAssignment.js';
import LmsSubmission from './models/LmsSubmission.js';
import LmsNotification from './models/LmsNotification.js';
import AcademicAuditLog from './models/AcademicAuditLog.js';
import User from './User.js';
import { resolveStudentProfileForUser } from './services/studentIdentityService.js';
import {
  LMS_CLASS_STORAGE_LIMIT_BYTES,
  inspectStoredLmsUpload,
  listLmsStoredFiles,
  removeLmsStoredFile,
  resolveLmsStoragePath,
  sanitizeLmsOriginalName,
} from './services/lmsStorageService.js';

async function getOffering(offeringId) {
  return CourseOffering.findById(offeringId)
    .populate('term', 'code name schoolYear semester status isActive lmsOpensAt lmsClosesAt')
    .populate('instructor', 'username firstName lastName email role');
}

async function resolveViewer(req, offeringId) {
  const offering = await getOffering(offeringId);
  if (!offering) return { error: { status: 404, message: 'Class offering not found.' } };

  if (['admin', 'registrar'].includes(req.user.role)) {
    return { offering, canManage: req.user.role === 'admin', membership: null };
  }
  if (req.user.role === 'instructor') {
    if (String(offering.instructor?._id || offering.instructor) !== String(req.user._id)) {
      return { error: { status: 403, message: 'You are not assigned to this class.' } };
    }
    return { offering, canManage: true, membership: null };
  }
  if (req.user.role === 'student') {
    const student = await resolveStudentProfileForUser(req.user);
    if (!student) return { error: { status: 404, message: 'Student profile not found.' } };
    const membership = await CourseMembership.findOne({
      student: student._id,
      offering: offering._id,
      status: { $in: ['enrolled', 'completed'] },
    });
    if (!membership) return { error: { status: 403, message: 'You are not enrolled in this class.' } };
    if (!offering.lmsEnabled) return { error: { status: 403, message: 'LMS access is not enabled for this class.' } };
    return { offering, canManage: false, membership };
  }
  return { error: { status: 403, message: 'Your account cannot access LMS classes.' } };
}

function sendAccessError(res, error) {
  return res.status(error.status).json({ success: false, message: error.message });
}

function isCurrentLmsOffering(offering) {
  return Boolean(
    offering?.lmsEnabled
    && ['active', 'open'].includes(offering.status)
    && offering.term?.isActive
  );
}

function dashboardOfferingFields() {
  return 'subjectCode subjectName sectionCode instructorName schedule status lmsEnabled term';
}

async function findCurrentLmsOfferings(filter = {}) {
  const offerings = await CourseOffering.find({
    ...filter,
    lmsEnabled: true,
    status: { $in: ['active', 'open'] },
  })
    .populate('term', 'code name schoolYear semester status isActive')
    .sort({ subjectCode: 1, sectionCode: 1 });
  return offerings.filter(isCurrentLmsOffering);
}

export const getLmsDashboard = asyncHandler(async (req, res) => {
  const role = req.user.role;
  let classes = [];
  let student = null;

  if (role === 'student') {
    student = await resolveStudentProfileForUser(req.user);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });
    const memberships = await CourseMembership.find({
      student: student._id,
      status: { $in: ['enrolled', 'completed'] },
    }).populate({
      path: 'offering',
      populate: { path: 'term', select: 'code name schoolYear semester status isActive' },
    });
    classes = memberships.map((membership) => membership.offering).filter(isCurrentLmsOffering);
  } else if (role === 'instructor') {
    classes = await findCurrentLmsOfferings({ instructor: req.user._id });
  } else if (role === 'admin') {
    classes = await findCurrentLmsOfferings();
  } else {
    return res.status(403).json({ success: false, message: 'Your account cannot access the LMS dashboard.' });
  }

  const offeringIds = classes.map((offering) => offering._id);
  const emptyData = {
    role,
    classes,
    counts: { classes: classes.length, upcoming: 0, overdue: 0, returned: 0, pendingGrading: 0, students: 0 },
    upcomingAssignments: [],
    overdueAssignments: [],
    returnedSubmissions: [],
    recentGrades: [],
    latestAnnouncements: [],
    recentMaterials: [],
    pendingSubmissions: [],
  };
  if (offeringIds.length === 0) return res.json({ success: true, data: emptyData });

  if (role === 'student') {
    const [assignments, submissions, announcements, materials] = await Promise.all([
      LmsAssignment.find({ offering: { $in: offeringIds }, status: 'published' })
        .populate('offering', dashboardOfferingFields())
        .sort({ dueAt: 1 }),
      LmsSubmission.find({ offering: { $in: offeringIds }, student: student._id })
        .populate('assignment', 'title dueAt points status')
        .populate('offering', dashboardOfferingFields())
        .sort({ updatedAt: -1 }),
      LmsAnnouncement.find({ offering: { $in: offeringIds } })
        .populate('offering', dashboardOfferingFields())
        .sort({ publishedAt: -1 })
        .limit(8),
      LmsMaterial.find({ offering: { $in: offeringIds } })
        .populate('offering', dashboardOfferingFields())
        .sort({ createdAt: -1 })
        .limit(8),
    ]);
    const submittedAssignmentIds = new Set(submissions.map((submission) => String(submission.assignment?._id || submission.assignment)));
    const now = Date.now();
    const unsubmitted = assignments.filter((assignment) => !submittedAssignmentIds.has(String(assignment._id)));
    const upcomingAssignments = unsubmitted.filter((assignment) => new Date(assignment.dueAt).getTime() >= now);
    const overdueAssignments = unsubmitted.filter((assignment) => new Date(assignment.dueAt).getTime() < now);
    const returnedSubmissions = submissions.filter((submission) => submission.status === 'returned');
    const recentGrades = submissions
      .filter((submission) => submission.status === 'graded')
      .sort((left, right) => new Date(right.gradedAt || right.updatedAt) - new Date(left.gradedAt || left.updatedAt))
      .slice(0, 8);
    return res.json({
      success: true,
      data: {
        ...emptyData,
        counts: {
          ...emptyData.counts,
          upcoming: upcomingAssignments.length,
          overdue: overdueAssignments.length,
          returned: returnedSubmissions.length,
        },
        upcomingAssignments,
        overdueAssignments,
        returnedSubmissions,
        recentGrades,
        latestAnnouncements: announcements,
        recentMaterials: materials,
      },
    });
  }

  const [pendingSubmissions, upcomingAssignments, enrolledStudents] = await Promise.all([
    LmsSubmission.find({ offering: { $in: offeringIds }, status: { $in: ['submitted', 'late'] } })
      .populate('student', 'studentId firstName lastName schoolEmail')
      .populate('assignment', 'title dueAt points status')
      .populate('offering', dashboardOfferingFields())
      .sort({ submittedAt: 1 }),
    LmsAssignment.find({ offering: { $in: offeringIds }, status: 'published', dueAt: { $gte: new Date() } })
      .populate('offering', dashboardOfferingFields())
      .sort({ dueAt: 1 })
      .limit(12),
    CourseMembership.distinct('student', { offering: { $in: offeringIds }, status: 'enrolled' }),
  ]);

  res.json({
    success: true,
    data: {
      ...emptyData,
      counts: {
        ...emptyData.counts,
        upcoming: upcomingAssignments.length,
        pendingGrading: pendingSubmissions.length,
        students: enrolledStudents.length,
      },
      upcomingAssignments,
      pendingSubmissions,
    },
  });
});

async function requireEnabledEditor(req, res) {
  const access = await resolveViewer(req, req.params.offeringId);
  if (access.error) {
    sendAccessError(res, access.error);
    return null;
  }
  if (!access.canManage) {
    res.status(403).json({ success: false, message: 'Only assigned instructors or Admin can manage class content.' });
    return null;
  }
  if (!access.offering.lmsEnabled) {
    res.status(409).json({ success: false, message: 'Enable LMS for this offering before adding content.' });
    return null;
  }
  return access;
}

async function logLmsAction(req, action, entityType, entityId, metadata = {}) {
  await AcademicAuditLog.create({
    actor: req.user?._id || null,
    actorRole: req.user?.role || 'system',
    action,
    entityType,
    entityId: String(entityId),
    metadata,
  });
}

async function findStudentNotificationRecipients(offeringId) {
  const memberships = await CourseMembership.find({
    offering: offeringId,
    status: { $in: ['enrolled', 'completed'] },
  }).select('student studentUser').lean();
  const recipientIds = new Set(memberships.filter((item) => item.studentUser).map((item) => String(item.studentUser)));
  const profilesWithoutUsers = memberships.filter((item) => !item.studentUser).map((item) => item.student);
  if (profilesWithoutUsers.length > 0) {
    const users = await User.find({ role: 'student', studentProfile: { $in: profilesWithoutUsers } }).select('_id').lean();
    users.forEach((user) => recipientIds.add(String(user._id)));
  }
  return [...recipientIds];
}

async function createLmsNotifications({ recipients, actor, offering, type, title, message, tab, sourceId }) {
  const uniqueRecipients = [...new Set(recipients.filter(Boolean).map(String))]
    .filter((recipient) => recipient !== String(actor || ''));
  if (uniqueRecipients.length === 0) return;
  try {
    await LmsNotification.insertMany(uniqueRecipients.map((targetUser) => ({
      targetUser,
      actor: actor || null,
      offering,
      type,
      title,
      message,
      tab,
      sourceId: String(sourceId || ''),
    })));
  } catch (error) {
    console.error('Unable to create LMS notifications:', error.message);
  }
}

async function notifyStudents(req, offering, notification) {
  const recipients = await findStudentNotificationRecipients(offering._id || offering);
  await createLmsNotifications({ recipients, actor: req.user._id, offering: offering._id || offering, ...notification });
}

function addStoredReference(references, record) {
  if (!record.storageName || references.has(record.storageName)) return;
  references.set(record.storageName, {
    storageName: record.storageName,
    size: Number(record.size || 0),
    checksum: record.checksum || '',
    source: record.source,
  });
}

async function getOfferingStorageReferences(offeringId) {
  const [materials, submissions] = await Promise.all([
    LmsMaterial.find({ offering: offeringId }).select('storageName size checksum').lean(),
    LmsSubmission.find({ offering: offeringId }).select('storageName size checksum attempts.storageName attempts.size attempts.checksum').lean(),
  ]);
  const references = new Map();
  materials.forEach((material) => addStoredReference(references, { ...material, source: `material:${material._id}` }));
  submissions.forEach((submission) => {
    addStoredReference(references, { ...submission, source: `submission:${submission._id}` });
    submission.attempts?.forEach((attempt) => addStoredReference(references, {
      ...attempt,
      source: `submission-attempt:${submission._id}:${attempt._id}`,
    }));
  });
  return references;
}

export const validateLmsUploadedFile = asyncHandler(async (req, res, next) => {
  if (!req.file) return next();
  try {
    const inspected = await inspectStoredLmsUpload(req.file);
    const offering = req.lmsOffering || req.lmsAssignmentAccess?.offering;
    if (!offering) throw new Error('Upload class could not be verified.');
    const references = await getOfferingStorageReferences(offering._id || offering);
    const usedBytes = [...references.values()].reduce((sum, item) => sum + item.size, 0);
    if (usedBytes + req.file.size > LMS_CLASS_STORAGE_LIMIT_BYTES) {
      const error = new Error('Class storage limit reached. Remove unused files or contact Admin.');
      error.status = 413;
      throw error;
    }
    if (req.lmsOffering) {
      const duplicate = await LmsMaterial.exists({ offering: offering._id, checksum: inspected.checksum });
      if (duplicate) {
        const error = new Error('This file already exists in class materials.');
        error.status = 409;
        throw error;
      }
    } else {
      const duplicate = await LmsSubmission.exists({
        assignment: req.lmsAssignmentAccess.assignment._id,
        student: req.lmsAssignmentAccess.membership.student,
        $or: [{ checksum: inspected.checksum }, { 'attempts.checksum': inspected.checksum }],
      });
      if (duplicate) {
        const error = new Error('This exact file was already submitted for this assignment.');
        error.status = 409;
        throw error;
      }
    }
    req.file.detectedMimeType = inspected.mimeType;
    req.file.checksum = inspected.checksum;
    req.file.originalname = sanitizeLmsOriginalName(req.file.originalname);
    next();
  } catch (error) {
    await removeLmsStoredFile(req.file.path);
    res.status(error.status || 400).json({ success: false, message: error.message || 'File validation failed.' });
  }
});

export const auditLmsStorage = asyncHandler(async (_req, res) => {
  const [storedFiles, materials, submissions] = await Promise.all([
    listLmsStoredFiles(),
    LmsMaterial.find().select('offering storageName size checksum').lean(),
    LmsSubmission.find().select('offering storageName size checksum attempts.storageName attempts.size attempts.checksum').lean(),
  ]);
  const references = new Map();
  materials.forEach((material) => addStoredReference(references, { ...material, source: `material:${material._id}` }));
  submissions.forEach((submission) => {
    addStoredReference(references, { ...submission, source: `submission:${submission._id}` });
    submission.attempts?.forEach((attempt) => addStoredReference(references, {
      ...attempt,
      source: `submission-attempt:${submission._id}:${attempt._id}`,
    }));
  });
  const storedNames = new Set(storedFiles);
  const missingFiles = [...references.values()].filter((reference) => !storedNames.has(reference.storageName));
  const orphanFiles = storedFiles.filter((storageName) => !references.has(storageName));
  const checksumGroups = new Map();
  [...references.values()].filter((reference) => reference.checksum).forEach((reference) => {
    const group = checksumGroups.get(reference.checksum) || [];
    group.push(reference);
    checksumGroups.set(reference.checksum, group);
  });
  const duplicates = [...checksumGroups.entries()]
    .filter(([, records]) => new Set(records.map((record) => record.storageName)).size > 1)
    .map(([checksum, records]) => ({ checksum, records }));
  res.json({
    success: true,
    data: {
      healthy: missingFiles.length === 0 && orphanFiles.length === 0 && duplicates.length === 0,
      classStorageLimitBytes: LMS_CLASS_STORAGE_LIMIT_BYTES,
      storedFileCount: storedFiles.length,
      referencedFileCount: references.size,
      referencedBytes: [...references.values()].reduce((sum, reference) => sum + reference.size, 0),
      missingFiles,
      orphanFiles,
      duplicates,
    },
  });
});

async function ensureStudentDeadlineReminders(user) {
  const student = await resolveStudentProfileForUser(user);
  if (!student) return;
  const memberships = await CourseMembership.find({
    student: student._id,
    status: { $in: ['enrolled', 'completed'] },
  }).populate({
    path: 'offering',
    populate: { path: 'term', select: 'isActive' },
  });
  const offerings = memberships.map((membership) => membership.offering).filter(isCurrentLmsOffering);
  if (offerings.length === 0) return;
  const now = new Date();
  const reminderCutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const assignments = await LmsAssignment.find({
    offering: { $in: offerings.map((offering) => offering._id) },
    status: 'published',
    dueAt: { $gte: now, $lte: reminderCutoff },
  }).lean();
  if (assignments.length === 0) return;
  const submittedAssignmentIds = new Set(await LmsSubmission.distinct('assignment', {
    student: student._id,
    assignment: { $in: assignments.map((assignment) => assignment._id) },
  }).then((ids) => ids.map(String)));
  const dueSoon = assignments.filter((assignment) => !submittedAssignmentIds.has(String(assignment._id)));
  if (dueSoon.length === 0) return;
  await LmsNotification.bulkWrite(dueSoon.map((assignment) => ({
    updateOne: {
      filter: {
        targetUser: user._id,
        type: 'assignment',
        sourceId: `deadline:${assignment._id}`,
      },
      update: {
        $setOnInsert: {
          targetUser: user._id,
          actor: null,
          offering: assignment.offering,
          type: 'assignment',
          title: `Due soon: ${assignment.title}`,
          message: `Due ${assignment.dueAt.toLocaleString('en-PH')}`,
          tab: 'assignments',
          sourceId: `deadline:${assignment._id}`,
          readAt: null,
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  })));
}

export const listLmsNotifications = asyncHandler(async (req, res) => {
  if (req.user.role === 'student') await ensureStudentDeadlineReminders(req.user);
  const [notifications, unreadCount] = await Promise.all([
    LmsNotification.find({ targetUser: req.user._id })
      .populate('actor', 'firstName lastName role')
      .populate('offering', dashboardOfferingFields())
      .sort({ createdAt: -1 })
      .limit(50),
    LmsNotification.countDocuments({ targetUser: req.user._id, readAt: null }),
  ]);
  res.json({ success: true, data: notifications, unreadCount });
});

export const markLmsNotificationRead = asyncHandler(async (req, res) => {
  const notification = await LmsNotification.findOneAndUpdate(
    { _id: req.params.id, targetUser: req.user._id },
    { $set: { readAt: new Date() } },
    { new: true }
  ).populate('offering', dashboardOfferingFields());
  if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
  res.json({ success: true, data: notification });
});

export const markAllLmsNotificationsRead = asyncHandler(async (req, res) => {
  const result = await LmsNotification.updateMany(
    { targetUser: req.user._id, readAt: null },
    { $set: { readAt: new Date() } }
  );
  res.json({ success: true, updatedCount: result.modifiedCount });
});

export const getLmsClass = asyncHandler(async (req, res) => {
  const access = await resolveViewer(req, req.params.offeringId);
  if (access.error) return sendAccessError(res, access.error);
  const [rosterCount, announcementCount, materialCount, assignmentCount] = await Promise.all([
    CourseMembership.countDocuments({ offering: access.offering._id, status: { $in: ['enrolled', 'completed'] } }),
    LmsAnnouncement.countDocuments({ offering: access.offering._id }),
    LmsMaterial.countDocuments({ offering: access.offering._id }),
    LmsAssignment.countDocuments({ offering: access.offering._id, status: { $in: ['published', 'closed'] } }),
  ]);
  res.json({
    success: true,
    data: {
      offering: access.offering,
      membership: access.membership,
      canManage: access.canManage,
      rosterCount,
      announcementCount,
      materialCount,
      assignmentCount,
    },
  });
});

export const listAnnouncements = asyncHandler(async (req, res) => {
  const access = await resolveViewer(req, req.params.offeringId);
  if (access.error) return sendAccessError(res, access.error);
  const announcements = await LmsAnnouncement.find({ offering: access.offering._id })
    .populate('author', 'firstName lastName role')
    .sort({ isPinned: -1, publishedAt: -1 });
  res.json({ success: true, data: announcements });
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  const access = await requireEnabledEditor(req, res);
  if (!access) return;
  const title = String(req.body.title || '').trim();
  const body = String(req.body.body || '').trim();
  if (!title || !body) return res.status(400).json({ success: false, message: 'Title and message are required.' });
  const announcement = await LmsAnnouncement.create({
    offering: access.offering._id,
    author: req.user._id,
    title,
    body,
    isPinned: Boolean(req.body.isPinned),
  });
  await announcement.populate('author', 'firstName lastName role');
  await logLmsAction(req, 'created_lms_announcement', 'lms_announcement', announcement._id, {
    offeringId: String(access.offering._id),
  });
  await notifyStudents(req, access.offering, {
    type: 'announcement',
    title: `New announcement: ${announcement.title}`,
    message: `${access.offering.subjectCode} · ${access.offering.sectionCode}`,
    tab: 'announcements',
    sourceId: announcement._id,
  });
  res.status(201).json({ success: true, data: announcement });
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await LmsAnnouncement.findById(req.params.id);
  if (!announcement) return res.status(404).json({ success: false, message: 'Announcement not found.' });
  req.params.offeringId = String(announcement.offering);
  const access = await requireEnabledEditor(req, res);
  if (!access) return;
  await announcement.deleteOne();
  await logLmsAction(req, 'deleted_lms_announcement', 'lms_announcement', announcement._id, {
    offeringId: String(announcement.offering),
  });
  res.json({ success: true });
});

export const listMaterials = asyncHandler(async (req, res) => {
  const access = await resolveViewer(req, req.params.offeringId);
  if (access.error) return sendAccessError(res, access.error);
  const materials = await LmsMaterial.find({ offering: access.offering._id })
    .populate('author', 'firstName lastName role')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: materials });
});

export const authorizeMaterialUpload = asyncHandler(async (req, res, next) => {
  const access = await requireEnabledEditor(req, res);
  if (!access) return;
  req.lmsOffering = access.offering;
  next();
});

export const createMaterial = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Select a file to upload.' });
  const title = String(req.body.title || path.parse(req.file.originalname).name).trim();
  let material;
  try {
    material = await LmsMaterial.create({
      offering: req.lmsOffering._id,
      author: req.user._id,
      title,
      description: String(req.body.description || '').trim(),
      originalName: req.file.originalname,
      storageName: req.file.filename,
      mimeType: req.file.detectedMimeType,
      size: req.file.size,
      checksum: req.file.checksum,
    });
  } catch (error) {
    await removeLmsStoredFile(req.file.path);
    throw error;
  }
  await material.populate('author', 'firstName lastName role');
  await logLmsAction(req, 'uploaded_lms_material', 'lms_material', material._id, {
    offeringId: String(req.lmsOffering._id),
    originalName: material.originalName,
  });
  await notifyStudents(req, req.lmsOffering, {
    type: 'material',
    title: `New material: ${material.title}`,
    message: `${req.lmsOffering.subjectCode} · ${req.lmsOffering.sectionCode}`,
    tab: 'materials',
    sourceId: material._id,
  });
  res.status(201).json({ success: true, data: material });
});

export const downloadMaterial = asyncHandler(async (req, res) => {
  const material = await LmsMaterial.findById(req.params.id);
  if (!material) return res.status(404).json({ success: false, message: 'Material not found.' });
  const access = await resolveViewer(req, material.offering);
  if (access.error) return sendAccessError(res, access.error);
  let filePath;
  try {
    filePath = resolveLmsStoragePath(material.storageName);
  } catch {
    return res.status(404).json({ success: false, message: 'Material file has an invalid storage reference.' });
  }
  try {
    await fs.access(filePath);
  } catch {
    return res.status(404).json({ success: false, message: 'Material file is missing from storage.' });
  }
  return res.download(filePath, material.originalName);
});

export const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await LmsMaterial.findById(req.params.id);
  if (!material) return res.status(404).json({ success: false, message: 'Material not found.' });
  req.params.offeringId = String(material.offering);
  const access = await requireEnabledEditor(req, res);
  if (!access) return;
  let filePath;
  try {
    filePath = resolveLmsStoragePath(material.storageName);
  } catch {
    return res.status(409).json({ success: false, message: 'Material file has an invalid storage reference.' });
  }
  await material.deleteOne();
  await removeLmsStoredFile(filePath);
  await logLmsAction(req, 'deleted_lms_material', 'lms_material', material._id, {
    offeringId: String(material.offering),
  });
  res.json({ success: true });
});

export const setOfferingLmsStatus = asyncHandler(async (req, res) => {
  const offering = await CourseOffering.findById(req.params.offeringId);
  if (!offering) return res.status(404).json({ success: false, message: 'Class offering not found.' });
  if (typeof req.body.enabled !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Enabled must be true or false.' });
  }
  offering.lmsEnabled = req.body.enabled;
  await offering.save();
  await logLmsAction(req, offering.lmsEnabled ? 'enabled_lms_offering' : 'disabled_lms_offering', 'course_offering', offering._id);
  res.json({ success: true, data: offering });
});

async function getAssignmentAccess(req, assignmentId) {
  const assignment = await LmsAssignment.findById(assignmentId)
    .populate('author', 'firstName lastName email role');
  if (!assignment) return { error: { status: 404, message: 'Assignment not found.' } };
  const access = await resolveViewer(req, assignment.offering);
  if (access.error) return access;
  if (!access.canManage && assignment.status === 'archived') {
    return { error: { status: 404, message: 'Assignment not found.' } };
  }
  return { ...access, assignment };
}

export const listAssignments = asyncHandler(async (req, res) => {
  const access = await resolveViewer(req, req.params.offeringId);
  if (access.error) return sendAccessError(res, access.error);
  const filter = { offering: access.offering._id };
  if (!access.canManage) filter.status = { $in: ['published', 'closed'] };
  else filter.status = { $ne: 'archived' };
  const assignments = await LmsAssignment.find(filter)
    .populate('author', 'firstName lastName email role')
    .sort({ dueAt: 1, createdAt: 1 });

  if (!access.membership) return res.json({ success: true, data: assignments });
  const submissions = await LmsSubmission.find({
    assignment: { $in: assignments.map((assignment) => assignment._id) },
    student: access.membership.student,
  }).lean();
  const submissionsByAssignment = new Map(submissions.map((submission) => [String(submission.assignment), submission]));
  const data = assignments.map((assignment) => ({
    ...assignment.toObject(),
    submission: submissionsByAssignment.get(String(assignment._id)) || null,
  }));
  return res.json({ success: true, data });
});

export const createAssignment = asyncHandler(async (req, res) => {
  const access = await requireEnabledEditor(req, res);
  if (!access) return;
  const title = String(req.body.title || '').trim();
  const dueAt = new Date(req.body.dueAt);
  const points = Number(req.body.points);
  if (!title) return res.status(400).json({ success: false, message: 'Assignment title is required.' });
  if (Number.isNaN(dueAt.getTime())) return res.status(400).json({ success: false, message: 'Valid due date is required.' });
  if (!Number.isFinite(points) || points < 1 || points > 1000) {
    return res.status(400).json({ success: false, message: 'Points must be between 1 and 1000.' });
  }
  const assignment = await LmsAssignment.create({
    offering: access.offering._id,
    author: req.user._id,
    title,
    instructions: String(req.body.instructions || '').trim(),
    dueAt,
    points,
    allowLateSubmissions: Boolean(req.body.allowLateSubmissions),
  });
  await assignment.populate('author', 'firstName lastName email role');
  await logLmsAction(req, 'created_lms_assignment', 'lms_assignment', assignment._id, {
    offeringId: String(access.offering._id),
    dueAt: assignment.dueAt,
    points: assignment.points,
  });
  await notifyStudents(req, access.offering, {
    type: 'assignment',
    title: `New assignment: ${assignment.title}`,
    message: `Due ${assignment.dueAt.toLocaleString('en-PH')}`,
    tab: 'assignments',
    sourceId: assignment._id,
  });
  res.status(201).json({ success: true, data: assignment });
});

export const updateAssignment = asyncHandler(async (req, res) => {
  const access = await getAssignmentAccess(req, req.params.id);
  if (access.error) return sendAccessError(res, access.error);
  if (!access.canManage) return res.status(403).json({ success: false, message: 'Only assigned instructors or Admin can edit assignments.' });
  if (!access.offering.lmsEnabled) return res.status(409).json({ success: false, message: 'Enable LMS before changing assignments.' });
  if (access.assignment.status === 'archived') return res.status(409).json({ success: false, message: 'Archived assignments cannot be edited.' });

  const previousDueAt = access.assignment.dueAt;
  if (req.body.title !== undefined) {
    const title = String(req.body.title || '').trim();
    if (!title) return res.status(400).json({ success: false, message: 'Assignment title is required.' });
    access.assignment.title = title;
  }
  if (req.body.instructions !== undefined) access.assignment.instructions = String(req.body.instructions || '').trim();
  if (req.body.dueAt !== undefined) {
    const dueAt = new Date(req.body.dueAt);
    if (Number.isNaN(dueAt.getTime())) return res.status(400).json({ success: false, message: 'Valid due date is required.' });
    access.assignment.dueAt = dueAt;
  }
  if (req.body.allowLateSubmissions !== undefined) {
    access.assignment.allowLateSubmissions = Boolean(req.body.allowLateSubmissions);
  }
  if (req.body.status !== undefined) {
    if (!['published', 'closed'].includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Assignment status must be published or closed.' });
    }
    access.assignment.status = req.body.status;
  }
  if (req.body.points !== undefined) {
    const points = Number(req.body.points);
    if (!Number.isFinite(points) || points < 1 || points > 1000) {
      return res.status(400).json({ success: false, message: 'Points must be between 1 and 1000.' });
    }
    if (points !== access.assignment.points) {
      const gradedSubmissions = await LmsSubmission.find({ assignment: access.assignment._id, status: 'graded' })
        .select('score')
        .lean();
      const highestScore = gradedSubmissions.reduce((highest, submission) => Math.max(highest, Number(submission.score || 0)), 0);
      if (points < highestScore) {
        return res.status(409).json({ success: false, message: `Points cannot be lower than existing score ${highestScore}.` });
      }
      if (gradedSubmissions.length > 0 && req.body.confirmPointChange !== true) {
        return res.status(409).json({ success: false, code: 'POINT_CHANGE_CONFIRMATION_REQUIRED', message: 'Changing points affects graded submissions. Confirm point change to continue.' });
      }
      access.assignment.points = points;
    }
  }
  await access.assignment.save();
  await logLmsAction(req, 'updated_lms_assignment', 'lms_assignment', access.assignment._id, {
    offeringId: String(access.offering._id),
    status: access.assignment.status,
    points: access.assignment.points,
  });
  if (req.body.dueAt !== undefined && previousDueAt.getTime() !== access.assignment.dueAt.getTime()) {
    await notifyStudents(req, access.offering, {
      type: 'assignment',
      title: `Deadline updated: ${access.assignment.title}`,
      message: `New due date: ${access.assignment.dueAt.toLocaleString('en-PH')}`,
      tab: 'assignments',
      sourceId: access.assignment._id,
    });
  }
  res.json({ success: true, data: access.assignment });
});

export const deleteAssignment = asyncHandler(async (req, res) => {
  const access = await getAssignmentAccess(req, req.params.id);
  if (access.error) return sendAccessError(res, access.error);
  if (!access.canManage) return res.status(403).json({ success: false, message: 'Only assigned instructors or Admin can delete assignments.' });
  if (!access.offering.lmsEnabled) return res.status(409).json({ success: false, message: 'Enable LMS before changing assignments.' });
  const submissionCount = await LmsSubmission.countDocuments({ assignment: access.assignment._id });
  if (submissionCount > 0) {
    access.assignment.status = 'archived';
    await access.assignment.save();
    await logLmsAction(req, 'archived_lms_assignment', 'lms_assignment', access.assignment._id, {
      offeringId: String(access.offering._id),
      submissionCount,
    });
    return res.json({ success: true, archived: true, data: access.assignment });
  }
  await access.assignment.deleteOne();
  await logLmsAction(req, 'deleted_lms_assignment', 'lms_assignment', access.assignment._id, {
    offeringId: String(access.offering._id),
  });
  res.json({ success: true });
});

export const authorizeSubmissionUpload = asyncHandler(async (req, res, next) => {
  const access = await getAssignmentAccess(req, req.params.assignmentId);
  if (access.error) return sendAccessError(res, access.error);
  if (!access.membership || req.user.role !== 'student') {
    return res.status(403).json({ success: false, message: 'Only enrolled students can submit assignment work.' });
  }
  if (!access.offering.lmsEnabled) return res.status(409).json({ success: false, message: 'LMS is not enabled for this class.' });
  if (access.assignment.status !== 'published') return res.status(409).json({ success: false, message: 'Assignment is closed.' });
  const isLate = Date.now() > access.assignment.dueAt.getTime();
  const existing = await LmsSubmission.findOne({
    assignment: access.assignment._id,
    student: access.membership.student,
  }).select('status');
  if (isLate && !access.assignment.allowLateSubmissions && existing?.status !== 'returned') {
    return res.status(409).json({ success: false, message: 'Assignment deadline has passed.' });
  }
  req.lmsAssignmentAccess = access;
  next();
});

export const submitAssignment = asyncHandler(async (req, res) => {
  const access = req.lmsAssignmentAccess;
  const text = String(req.body.text || '').trim();
  const existing = await LmsSubmission.findOne({
    assignment: access.assignment._id,
    student: access.membership.student,
  });
  if (existing?.status === 'graded') {
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    return res.status(409).json({ success: false, message: 'Graded submission cannot be replaced.' });
  }
  if (!text && !req.file && !existing?.storageName) {
    return res.status(400).json({ success: false, message: 'Enter a response or attach a file.' });
  }

  const previousAttempt = existing ? {
    text: existing.text,
    originalName: existing.originalName,
    storageName: existing.storageName,
    mimeType: existing.mimeType,
    size: existing.size,
    checksum: existing.checksum,
    submittedAt: existing.submittedAt,
    wasLate: existing.status === 'late',
  } : null;
  const isLate = Date.now() > access.assignment.dueAt.getTime();
  const submission = existing || new LmsSubmission({
    assignment: access.assignment._id,
    offering: access.offering._id,
    student: access.membership.student,
    studentUser: req.user._id,
  });
  submission.text = text;
  submission.status = isLate ? 'late' : 'submitted';
  submission.submittedAt = new Date();
  submission.score = null;
  submission.feedback = '';
  submission.gradedBy = null;
  submission.gradedAt = null;
  if (req.file) {
    submission.originalName = req.file.originalname;
    submission.storageName = req.file.filename;
    submission.mimeType = req.file.detectedMimeType;
    submission.size = req.file.size;
    submission.checksum = req.file.checksum;
  }
  if (existing && submission.attempts.length === 0) {
    submission.attempts.push({
      attemptNumber: 1,
      ...previousAttempt,
    });
  }
  submission.attempts.push({
    attemptNumber: submission.attempts.length + 1,
    text: submission.text,
    originalName: submission.originalName,
    storageName: submission.storageName,
    mimeType: submission.mimeType,
    size: submission.size,
    checksum: submission.checksum,
    submittedAt: submission.submittedAt,
    wasLate: isLate,
  });
  try {
    await submission.save();
  } catch (error) {
    if (req.file) await removeLmsStoredFile(req.file.path);
    throw error;
  }
  await logLmsAction(req, existing ? 'resubmitted_lms_assignment' : 'submitted_lms_assignment', 'lms_submission', submission._id, {
    assignmentId: String(access.assignment._id),
    offeringId: String(access.offering._id),
    late: isLate,
  });
  await createLmsNotifications({
    recipients: [access.offering.instructor?._id || access.offering.instructor],
    actor: req.user._id,
    offering: access.offering._id,
    type: 'submission',
    title: `${existing ? 'Resubmission' : 'New submission'}: ${access.assignment.title}`,
    message: `${req.user.firstName} ${req.user.lastName}${isLate ? ' · Late' : ''}`,
    tab: 'assignments',
    sourceId: submission._id,
  });
  res.status(existing ? 200 : 201).json({ success: true, data: submission });
});

export const listAssignmentSubmissions = asyncHandler(async (req, res) => {
  const access = await getAssignmentAccess(req, req.params.assignmentId);
  if (access.error) return sendAccessError(res, access.error);
  if (!access.canManage) return res.status(403).json({ success: false, message: 'Only assigned instructors or Admin can view all submissions.' });
  const submissions = await LmsSubmission.find({ assignment: access.assignment._id })
    .populate('student', 'studentId firstName lastName programId yearLevel')
    .populate('gradedBy', 'firstName lastName email role')
    .sort({ submittedAt: 1 });
  res.json({ success: true, data: submissions });
});

export const getOfferingGradebook = asyncHandler(async (req, res) => {
  const access = await resolveViewer(req, req.params.offeringId);
  if (access.error) return sendAccessError(res, access.error);
  if (!access.canManage) {
    return res.status(403).json({ success: false, message: 'Only assigned instructors or Admin can view the class gradebook.' });
  }
  const [assignments, memberships, submissions] = await Promise.all([
    LmsAssignment.find({ offering: access.offering._id, status: { $in: ['published', 'closed'] } })
      .select('title dueAt points allowLateSubmissions status')
      .sort({ dueAt: 1, createdAt: 1 })
      .lean(),
    CourseMembership.find({
      offering: access.offering._id,
      status: { $in: ['enrolled', 'completed'] },
    })
      .populate('student', 'studentId firstName lastName programId yearLevel')
      .sort({ createdAt: 1 })
      .lean(),
    LmsSubmission.find({ offering: access.offering._id })
      .select('assignment student status submittedAt score feedback originalName storageName')
      .lean(),
  ]);
  res.json({
    success: true,
    data: {
      assignments,
      memberships,
      submissions,
      totalPoints: assignments.reduce((sum, assignment) => sum + assignment.points, 0),
    },
  });
});

export const gradeSubmission = asyncHandler(async (req, res) => {
  const submission = await LmsSubmission.findById(req.params.id).populate('assignment');
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });
  const access = await resolveViewer(req, submission.offering);
  if (access.error) return sendAccessError(res, access.error);
  if (!access.canManage) return res.status(403).json({ success: false, message: 'Only assigned instructors or Admin can grade submissions.' });
  if (req.body.score === '' || req.body.score === null || req.body.score === undefined) {
    return res.status(400).json({ success: false, message: 'Score is required.' });
  }
  const score = Number(req.body.score);
  if (!Number.isFinite(score) || score < 0 || score > submission.assignment.points) {
    return res.status(400).json({ success: false, message: `Score must be between 0 and ${submission.assignment.points}.` });
  }
  submission.score = score;
  submission.feedback = String(req.body.feedback || '').trim();
  submission.status = 'graded';
  submission.gradedBy = req.user._id;
  submission.gradedAt = new Date();
  await submission.save();
  await submission.populate('student', 'studentId firstName lastName programId yearLevel');
  await logLmsAction(req, 'graded_lms_submission', 'lms_submission', submission._id, {
    assignmentId: String(submission.assignment._id),
    score,
  });
  await createLmsNotifications({
    recipients: [submission.studentUser],
    actor: req.user._id,
    offering: submission.offering,
    type: 'graded',
    title: `Graded: ${submission.assignment.title}`,
    message: `Score: ${score}/${submission.assignment.points}`,
    tab: 'assignments',
    sourceId: submission._id,
  });
  res.json({ success: true, data: submission });
});

export const returnSubmission = asyncHandler(async (req, res) => {
  const submission = await LmsSubmission.findById(req.params.id).populate('assignment');
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });
  const access = await resolveViewer(req, submission.offering);
  if (access.error) return sendAccessError(res, access.error);
  if (!access.canManage) return res.status(403).json({ success: false, message: 'Only assigned instructors or Admin can return submissions.' });
  const feedback = String(req.body.feedback || '').trim();
  if (!feedback) return res.status(400).json({ success: false, message: 'Feedback is required when returning work.' });
  submission.status = 'returned';
  submission.score = null;
  submission.feedback = feedback;
  submission.gradedBy = req.user._id;
  submission.gradedAt = new Date();
  await submission.save();
  await submission.populate('student', 'studentId firstName lastName programId yearLevel');
  await logLmsAction(req, 'returned_lms_submission', 'lms_submission', submission._id, {
    assignmentId: String(submission.assignment._id),
  });
  await createLmsNotifications({
    recipients: [submission.studentUser],
    actor: req.user._id,
    offering: submission.offering,
    type: 'returned',
    title: `Revision requested: ${submission.assignment.title}`,
    message: feedback,
    tab: 'assignments',
    sourceId: submission._id,
  });
  res.json({ success: true, data: submission });
});

export const downloadSubmission = asyncHandler(async (req, res) => {
  const submission = await LmsSubmission.findById(req.params.id);
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });
  if (!submission.storageName) return res.status(404).json({ success: false, message: 'Submission has no attached file.' });
  const access = await resolveViewer(req, submission.offering);
  if (access.error) return sendAccessError(res, access.error);
  if (!access.canManage && String(access.membership?.student) !== String(submission.student)) {
    return res.status(403).json({ success: false, message: 'You cannot download another student’s submission.' });
  }
  let filePath;
  try {
    filePath = resolveLmsStoragePath(submission.storageName);
  } catch {
    return res.status(404).json({ success: false, message: 'Submission file has an invalid storage reference.' });
  }
  try {
    await fs.access(filePath);
  } catch {
    return res.status(404).json({ success: false, message: 'Submission file is missing from storage.' });
  }
  return res.download(filePath, submission.originalName);
});

export const downloadSubmissionAttempt = asyncHandler(async (req, res) => {
  const submission = await LmsSubmission.findById(req.params.id);
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });
  const attempt = submission.attempts.id(req.params.attemptId);
  if (!attempt || !attempt.storageName) return res.status(404).json({ success: false, message: 'Attempt file not found.' });
  const access = await resolveViewer(req, submission.offering);
  if (access.error) return sendAccessError(res, access.error);
  if (!access.canManage && String(access.membership?.student) !== String(submission.student)) {
    return res.status(403).json({ success: false, message: 'You cannot download another student’s submission.' });
  }
  let filePath;
  try {
    filePath = resolveLmsStoragePath(attempt.storageName);
  } catch {
    return res.status(404).json({ success: false, message: 'Attempt file has an invalid storage reference.' });
  }
  try {
    await fs.access(filePath);
  } catch {
    return res.status(404).json({ success: false, message: 'Attempt file is missing from storage.' });
  }
  return res.download(filePath, attempt.originalName);
});
