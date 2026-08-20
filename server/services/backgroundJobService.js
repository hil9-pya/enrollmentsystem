import BackgroundJob from '../models/BackgroundJob.js';
import {
  sendAdmissionApprovedEmail,
  sendAdmissionRejectedEmail,
  sendApplicationSubmittedEmail,
} from './emailService.js';

const handlers = {
  application_submitted_email: sendApplicationSubmittedEmail,
  admission_approved_email: sendAdmissionApprovedEmail,
  admission_rejected_email: sendAdmissionRejectedEmail,
};

export async function enqueueBackgroundJob(type, payload, { deduplicationKey = null } = {}) {
  if (!handlers[type]) throw new Error(`Unsupported background job type: ${type}`);
  if (deduplicationKey) {
    return BackgroundJob.findOneAndUpdate(
      { deduplicationKey },
      { $setOnInsert: { type, payload, deduplicationKey } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }
  return BackgroundJob.create({ type, payload });
}

async function processNextJob() {
  const job = await BackgroundJob.findOneAndUpdate(
    { status: 'queued', runAt: { $lte: new Date() } },
    { $set: { status: 'processing', lockedAt: new Date() } },
    { new: true, sort: { runAt: 1, createdAt: 1 } }
  );
  if (!job) return false;

  try {
    await handlers[job.type](job.payload);
    job.status = 'completed';
    job.completedAt = new Date();
    job.lockedAt = null;
    job.lastError = '';
  } catch (error) {
    job.attempts += 1;
    job.lastError = String(error.message || error).slice(0, 1000);
    job.lockedAt = null;
    if (job.attempts >= job.maxAttempts) {
      job.status = 'failed';
    } else {
      job.status = 'queued';
      job.runAt = new Date(Date.now() + Math.min(60_000 * 2 ** (job.attempts - 1), 60 * 60_000));
    }
  }
  await job.save();
  return true;
}

export async function recoverStaleJobs() {
  const staleBefore = new Date(Date.now() - 10 * 60_000);
  await BackgroundJob.updateMany(
    { status: 'processing', lockedAt: { $lt: staleBefore } },
    { $set: { status: 'queued', lockedAt: null, runAt: new Date() } }
  );
}

export function startBackgroundJobWorker() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      let processed = 0;
      while (processed < 10 && await processNextJob()) processed += 1;
    } catch (error) {
      console.error('Background job worker failed:', error.message);
    } finally {
      running = false;
    }
  };

  recoverStaleJobs().then(run).catch((error) => {
    console.error('Background job recovery failed:', error.message);
  });
  const timer = setInterval(run, 5000);
  timer.unref?.();
  return timer;
}
