import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  applyDeterministicAcademicRepairs,
  previewDeterministicAcademicRepairs,
} from '../services/deterministicAcademicRepairService.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../..');
dotenv.config({ path: path.join(scriptDirectory, '../.env') });
dotenv.config({ path: path.join(projectRoot, '.env') });
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');

const applyChanges = process.argv.includes('--apply');
await mongoose.connect(process.env.MONGO_URI);
try {
  const preview = await previewDeterministicAcademicRepairs();
  console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'preview', ...preview.summary }, null, 2));
  if (applyChanges && preview.publishedGradeMismatches.length) {
    const backupDirectory = path.join(projectRoot, '.local-backups');
    await fs.mkdir(backupDirectory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDirectory, `deterministic-academic-${timestamp}.json`);
    await fs.writeFile(backupPath, JSON.stringify(preview, null, 2), 'utf8');
    const result = await applyDeterministicAcademicRepairs(preview);
    console.log(JSON.stringify(result, null, 2));
    console.log('Backup:', backupPath);
  } else if (applyChanges) {
    console.log('No deterministic issues found. Nothing changed.');
  }
} finally {
  await mongoose.disconnect();
}
