import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema(
  {
    typeId: { type: String, required: true },
    fileName: { type: String, required: true },
    originalName: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { _id: false }
);

const SelectedSubjectSchema = new mongoose.Schema(
  {
    subjectId: { type: String, required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TuitionLineSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const StudentSchema = new mongoose.Schema(
  {
    // Human-readable student number (e.g. STU-2026-0001) doubles as the
    // Mongo primary key so the rest of the app can keep treating `id` as a
    // plain string identifier, exactly like the old SQLite schema did.
    _id: { type: String },

    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true, trim: true },
    phone: { type: String, default: '' },
    birthDate: { type: String, default: '' },
    address: { type: String, default: '' },

    enrollmentType: { type: String, default: null },
    programId: { type: String, default: null },
    academicTerm: { type: String, default: null },

    status: { type: String, default: 'registration' },

    documents: { type: [DocumentSchema], default: [] },
    selectedSubjects: { type: [SelectedSubjectSchema], default: [] },
    tuitionBreakdown: { type: [TuitionLineSchema], default: [] },
    totalTuition: { type: Number, default: 0 },

    paymentMethod: { type: String, default: null },
    paymentStatus: { type: String, default: 'unpaid' },
    submitDocumentsOnCampus: { type: Boolean, default: false },

    scheduleGenerated: { type: Boolean, default: false },
    registrationFormGenerated: { type: Boolean, default: false },
    receiptGenerated: { type: Boolean, default: false },

    admissionNotes: { type: String, default: '' },
    adviserNotes: { type: String, default: '' },
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
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const Student = mongoose.model('Student', StudentSchema);
export default Student;
