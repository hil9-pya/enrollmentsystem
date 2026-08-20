import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { migrateLegacyMembershipSnapshots } from '../services/legacyAcademicCleanupService.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../..');
dotenv.config({ path: path.join(scriptDirectory, '../.env') });
dotenv.config({ path: path.join(projectRoot, '.env') });

const requestedPath = process.argv[2];
if (!requestedPath) throw new Error('Backup path is required.');
const backupRoot = path.resolve(projectRoot, '.local-backups');
const backupPath = path.resolve(requestedPath);
if (!backupPath.startsWith(`${backupRoot}${path.sep}`)) {
  throw new Error('Backup must be inside .local-backups.');
}
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');

const preview = JSON.parse(await fs.readFile(backupPath, 'utf8'));
if (preview.gradedMemberships?.length) {
  throw new Error('Backup contains graded memberships; automatic restoration blocked.');
}
preview.snapshotMigratableStudentIds = preview.studentsWithoutRemainingMemberships || [];

await mongoose.connect(process.env.MONGO_URI);
try {
  const result = await migrateLegacyMembershipSnapshots(preview);
  console.log(JSON.stringify({
    backup: backupPath,
    restoredStudents: preview.snapshotMigratableStudentIds,
    ...result,
  }, null, 2));
} finally {
  await mongoose.disconnect();
}
