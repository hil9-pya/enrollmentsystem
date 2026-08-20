import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { buildAcademicIntegrityAudit } from '../services/academicIntegrityAuditService.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../..');
dotenv.config({ path: path.join(scriptDirectory, '../.env') });
dotenv.config({ path: path.join(projectRoot, '.env') });
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');

await mongoose.connect(process.env.MONGO_URI);
try {
  const audit = await buildAcademicIntegrityAudit();
  const issuesByType = audit.issues.reduce((counts, issue) => {
    counts[issue.type] = (counts[issue.type] || 0) + 1;
    return counts;
  }, {});
  console.log(JSON.stringify({ summary: audit.summary, issuesByType }, null, 2));
} finally {
  await mongoose.disconnect();
}
