import AcademicAuditLog from '../models/AcademicAuditLog.js';
import CourseMembership from '../models/CourseMembership.js';

export async function previewDeterministicAcademicRepairs() {
  const publishedGradeMismatches = await CourseMembership.find({
    gradeStatus: 'published',
    finalGrade: { $ne: null },
    status: { $ne: 'completed' },
  }).lean();
  return {
    generatedAt: new Date().toISOString(),
    publishedGradeMismatches,
    summary: { publishedGradeStatusMismatches: publishedGradeMismatches.length },
  };
}

export async function applyDeterministicAcademicRepairs(preview, { actor = null, actorRole = 'system' } = {}) {
  let repairedPublishedGradeStatuses = 0;
  for (const snapshot of preview.publishedGradeMismatches) {
    const membership = await CourseMembership.findOne({
      _id: snapshot._id,
      gradeStatus: 'published',
      finalGrade: { $ne: null },
      status: { $ne: 'completed' },
    });
    if (!membership) continue;
    const previousStatus = membership.status;
    membership.status = 'completed';
    membership.endedAt = membership.gradePublishedAt || new Date();
    await membership.save();
    await AcademicAuditLog.create({
      actor: actor?._id || null,
      actorRole,
      action: 'repaired_published_grade_status',
      entityType: 'course_membership',
      entityId: String(membership._id),
      metadata: { previousStatus, status: 'completed', deterministicRepair: true },
    });
    repairedPublishedGradeStatuses += 1;
  }
  return { repairedPublishedGradeStatuses };
}
