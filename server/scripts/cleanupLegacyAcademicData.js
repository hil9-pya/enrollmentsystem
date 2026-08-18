import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  applyLegacyAcademicCleanup,
  migrateLegacyMembershipSnapshots,
  previewLegacyAcademicCleanup,
} from '../services/legacyAcademicCleanupService.js';
import { backfillOfficialEnrollments } from '../services/academicFoundationService.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../..');
dotenv.config({ path: path.join(scriptDirectory, '../.env') });
dotenv.config({ path: path.join(projectRoot, '.env') });

const applyChanges = process.argv.includes('--apply');
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) throw new Error('MONGO_URI is not configured.');

await mongoose.connect(mongoUri);
try {
  const preview = await previewLegacyAcademicCleanup();
  console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'preview', ...preview.summary }, null, 2));
  console.log('Legacy terms:', preview.legacyTerms.map((term) => `${term.name} (${term._id})`));
  console.log('Affected students:', preview.affectedStudentIds);
  console.log('Students without another active/completed membership:', preview.studentsWithoutRemainingMemberships);
  console.log('Students rebuildable from saved schedules:', preview.rebuildableStudentIds);
  console.log('Students migratable from legacy snapshots:', preview.snapshotMigratableStudentIds);
  console.log('Unresolved students:', preview.unresolvedStudentIds);
  console.log('Unresolved details:', preview.affectedStudents
    .filter((student) => preview.unresolvedStudentIds.includes(String(student._id)))
    .map((student) => ({
      id: String(student._id),
      studentId: student.studentId,
      status: student.status,
      academicTerm: student.academicTerm,
      selectedSubjects: student.selectedSubjects?.length || 0,
      isDeleted: Boolean(student.isDeleted),
    })));
  console.log('Legacy memberships containing grades:', preview.gradedMemberships.map((membership) => String(membership._id)));

  if (applyChanges && preview.summary.terms > 0) {
    if (preview.unresolvedStudentIds.length > 0 || preview.gradedMemberships.length > 0) {
      throw new Error('Cleanup blocked: unresolved students or graded legacy memberships require manual review.');
    }
    const backupDirectory = path.join(projectRoot, '.local-backups');
    await fs.mkdir(backupDirectory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDirectory, `legacy-academic-${timestamp}.json`);
    await fs.writeFile(backupPath, JSON.stringify(preview, null, 2), 'utf8');
    const snapshotMigration = await migrateLegacyMembershipSnapshots(preview);
    const result = await applyLegacyAcademicCleanup(preview);
    const backfill = await backfillOfficialEnrollments();
    console.log('Snapshot migration:', JSON.stringify(snapshotMigration, null, 2));
    console.log('Cleanup result:', JSON.stringify(result, null, 2));
    console.log('Membership rebuild:', JSON.stringify(backfill, null, 2));
    console.log('Backup:', backupPath);
  } else if (applyChanges) {
    console.log('No generic legacy terms found. Nothing changed.');
  } else {
    console.log('Preview only. Run with --apply to remove listed legacy academic records.');
  }
} finally {
  await mongoose.disconnect();
}
