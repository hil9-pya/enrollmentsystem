import mongoose from 'mongoose';

const AcademicTermSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    schoolYear: { type: String, default: '', trim: true },
    semester: { type: String, enum: ['1', '2', 'summer', 'other'], default: 'other' },
    enrollmentStartsAt: { type: Date, default: null },
    enrollmentEndsAt: { type: Date, default: null },
    classesStartAt: { type: Date, default: null },
    classesEndAt: { type: Date, default: null },
    lmsOpensAt: { type: Date, default: null },
    lmsClosesAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['planned', 'active', 'closed', 'archived'],
      default: 'planned',
      index: true,
    },
    isActive: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('AcademicTerm', AcademicTermSchema);
