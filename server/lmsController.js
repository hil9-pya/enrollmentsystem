import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import asyncHandler from 'express-async-handler';
import CourseMembership from './models/CourseMembership.js';
import CourseOffering from './models/CourseOffering.js';
import LmsAnnouncement from './models/LmsAnnouncement.js';
import LmsMaterial from './models/LmsMaterial.js';
import AcademicAuditLog from './models/AcademicAuditLog.js';
import { resolveStudentProfileForUser } from './services/studentIdentityService.js';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const LMS_UPLOADS_DIRECTORY = path.join(moduleDirectory, 'lms-uploads');

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

export const getLmsClass = asyncHandler(async (req, res) => {
  const access = await resolveViewer(req, req.params.offeringId);
  if (access.error) return sendAccessError(res, access.error);
  const [rosterCount, announcementCount, materialCount] = await Promise.all([
    CourseMembership.countDocuments({ offering: access.offering._id, status: { $in: ['enrolled', 'completed'] } }),
    LmsAnnouncement.countDocuments({ offering: access.offering._id }),
    LmsMaterial.countDocuments({ offering: access.offering._id }),
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
  const material = await LmsMaterial.create({
    offering: req.lmsOffering._id,
    author: req.user._id,
    title,
    description: String(req.body.description || '').trim(),
    originalName: req.file.originalname,
    storageName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
  await material.populate('author', 'firstName lastName role');
  await logLmsAction(req, 'uploaded_lms_material', 'lms_material', material._id, {
    offeringId: String(req.lmsOffering._id),
    originalName: material.originalName,
  });
  res.status(201).json({ success: true, data: material });
});

export const downloadMaterial = asyncHandler(async (req, res) => {
  const material = await LmsMaterial.findById(req.params.id);
  if (!material) return res.status(404).json({ success: false, message: 'Material not found.' });
  const access = await resolveViewer(req, material.offering);
  if (access.error) return sendAccessError(res, access.error);
  const filePath = path.join(LMS_UPLOADS_DIRECTORY, path.basename(material.storageName));
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
  const filePath = path.join(LMS_UPLOADS_DIRECTORY, path.basename(material.storageName));
  await material.deleteOne();
  await fs.unlink(filePath).catch(() => {});
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
