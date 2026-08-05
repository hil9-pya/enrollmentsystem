import mongoose from 'mongoose';

const CourseOfferingSchema = new mongoose.Schema(
  {
    term: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true, index: true },
    subjectId: { type: String, required: true, trim: true, index: true },
    subjectCode: { type: String, required: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    units: { type: Number, required: true, min: 0 },
    sectionKey: { type: String, required: true, trim: true },
    sectionCode: { type: String, required: true, trim: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
    schedule: {
      day: { type: String, default: 'TBA' },
      time: { type: String, default: 'TBA' },
      room: { type: String, default: 'TBA' },
    },
    instructorName: { type: String, default: 'TBA', trim: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    capacity: { type: Number, default: 40, min: 1 },
    status: { type: String, enum: ['draft', 'open', 'active', 'closed', 'archived'], default: 'active' },
    lmsEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CourseOfferingSchema.index(
  { term: 1, subjectId: 1, sectionKey: 1 },
  { unique: true }
);

export default mongoose.model('CourseOffering', CourseOfferingSchema);
