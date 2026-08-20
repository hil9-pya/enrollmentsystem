import mongoose from 'mongoose';

const LmsAssignmentSchema = new mongoose.Schema(
  {
    offering: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseOffering', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    instructions: { type: String, default: '', trim: true, maxlength: 10000 },
    dueAt: { type: Date, required: true, index: true },
    points: { type: Number, required: true, min: 1, max: 1000 },
    allowLateSubmissions: { type: Boolean, default: false },
    status: { type: String, enum: ['published', 'closed', 'archived'], default: 'published', index: true },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

LmsAssignmentSchema.index({ offering: 1, status: 1, dueAt: 1 });

export default mongoose.model('LmsAssignment', LmsAssignmentSchema);
