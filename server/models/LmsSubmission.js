import mongoose from 'mongoose';

const SubmissionAttemptSchema = new mongoose.Schema(
  {
    attemptNumber: { type: Number, required: true, min: 1 },
    text: { type: String, default: '', trim: true, maxlength: 10000 },
    originalName: { type: String, default: '', trim: true },
    storageName: { type: String, default: '', trim: true },
    mimeType: { type: String, default: '', trim: true },
    size: { type: Number, default: 0, min: 0 },
    checksum: { type: String, default: '', trim: true },
    submittedAt: { type: Date, required: true },
    wasLate: { type: Boolean, default: false },
  },
  { _id: true }
);

const LmsSubmissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'LmsAssignment', required: true, index: true },
    offering: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseOffering', required: true, index: true },
    student: { type: String, ref: 'Student', required: true, index: true },
    studentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    text: { type: String, default: '', trim: true, maxlength: 10000 },
    originalName: { type: String, default: '', trim: true },
    storageName: { type: String, default: '', trim: true },
    mimeType: { type: String, default: '', trim: true },
    size: { type: Number, default: 0, min: 0 },
    checksum: { type: String, default: '', trim: true, index: true },
    status: { type: String, enum: ['submitted', 'late', 'graded', 'returned'], default: 'submitted', index: true },
    submittedAt: { type: Date, default: Date.now },
    score: { type: Number, default: null, min: 0 },
    feedback: { type: String, default: '', trim: true, maxlength: 5000 },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    gradedAt: { type: Date, default: null },
    attempts: { type: [SubmissionAttemptSchema], default: [] },
  },
  { timestamps: true }
);

LmsSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export default mongoose.model('LmsSubmission', LmsSubmissionSchema);
