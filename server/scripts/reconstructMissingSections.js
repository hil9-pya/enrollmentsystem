import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import {
  applyMissingSectionReconstruction,
  previewMissingSectionReconstruction,
} from '../services/missingSectionReconstructionService.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../..');
dotenv.config({ path: path.join(scriptDirectory, '../.env') });
dotenv.config({ path: path.join(projectRoot, '.env') });
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');

const applyChanges = process.argv.includes('--apply');
await mongoose.connect(process.env.MONGO_URI);
try {
  const preview = await previewMissingSectionReconstruction();
  console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'preview', ...preview.summary }, null, 2));
  if (!applyChanges) {
    console.log(JSON.stringify(preview.plans.map((plan) => ({
      action: plan.action,
      offeringId: String(plan.offering._id),
      sectionId: plan.missingSectionId,
      subject: plan.offering.subjectCode,
      section: plan.offering.sectionCode,
      schedule: plan.offering.schedule,
      reservations: plan.studentIds.length,
    })), null, 2));
  } else if (preview.conflicts.length) {
    throw new Error(`Refusing repair: ${preview.conflicts.length} section-code conflict(s) require manual review.`);
  } else if (preview.plans.length) {
    const backupDirectory = path.join(projectRoot, '.local-backups');
    await fs.mkdir(backupDirectory, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDirectory, `missing-sections-${timestamp}.json`);
    await fs.writeFile(backupPath, JSON.stringify(preview, null, 2), 'utf8');
    const result = await applyMissingSectionReconstruction(preview);
    console.log(JSON.stringify(result, null, 2));
    console.log('Backup:', backupPath);
  } else {
    console.log('No safe section reconstructions found. Nothing changed.');
  }
} finally {
  await mongoose.disconnect();
}
