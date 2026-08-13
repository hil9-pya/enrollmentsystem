import mongoose from 'mongoose';

const BackgroundJobSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    runAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    lastError: { type: String, default: '' },
    deduplicationKey: { type: String, default: null },
  },
  { timestamps: true }
);

BackgroundJobSchema.index(
  { deduplicationKey: 1 },
  { unique: true, sparse: true }
);
BackgroundJobSchema.index({ status: 1, runAt: 1, createdAt: 1 });

export default mongoose.model('BackgroundJob', BackgroundJobSchema);
