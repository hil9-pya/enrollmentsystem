import mongoose from 'mongoose';

const CourseMembershipSchema = new mongoose.Schema(
  {
    student: { type: String, ref: 'Student', required: true, index: true },
    studentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    term: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true, index: true },
    offering: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseOffering', required: true, index: true },
    status: {
      type: String,
      enum: ['enrolled', 'dropped', 'withdrawn', 'completed'],
      default: 'enrolled',
      index: true,
    },
    source: { type: String, enum: ['registrar', 'migration'], default: 'registrar' },
    enrolledAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    finalGrade: { type: Number, default: null },
    gradeStatus: {
      type: String,
      enum: ['not_submitted', 'submitted', 'returned', 'approved', 'published'],
      default: 'not_submitted',
    },
    gradeSubmittedAt: { type: Date, default: null },
    gradeReviewedAt: { type: Date, default: null },
    gradePublishedAt: { type: Date, default: null },
    gradeReviewNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

CourseMembershipSchema.index({ student: 1, offering: 1 }, { unique: true });
CourseMembershipSchema.index({ student: 1, term: 1, status: 1 });

export default mongoose.model('CourseMembership', CourseMembershipSchema);
