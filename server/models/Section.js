import mongoose from 'mongoose';

// Tracks live enrollment counts and overrides for static catalog sections.
// A Section document corresponds to one class section offering for one subject.
const SectionSchema = new mongoose.Schema(
  {
    subjectId: { type: String, required: true, index: true }, // matches SUBJECTS_CATALOG id
    sectionCode: { type: String, required: true },            // e.g. "CS 101-A"
    days: { type: String, required: true },                   // e.g. "MWF", "TTH"
    time: { type: String, required: true },                   // e.g. "8:00 AM - 9:30 AM"
    room: { type: String, default: '' },
    instructor: { type: String, default: '' },
    instructorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    maxSlots: { type: Number, required: true, default: 40 },
    enrolledCount: { type: Number, default: 0, min: 0 },
    enrolledStudentIds: { type: [String], default: [], select: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index: a section code must be unique per subject
SectionSchema.index({ subjectId: 1, sectionCode: 1 }, { unique: true });

// Virtual: remaining slots
SectionSchema.virtual('availableSlots').get(function () {
  return Math.max(0, this.maxSlots - this.enrolledCount);
});

const Section = mongoose.model('Section', SectionSchema);
export default Section;
