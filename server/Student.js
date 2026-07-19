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
    sectionId: { type: String, required: true },
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

const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    user: { type: String, required: true },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const HoldSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // e.g., 'readmission', 'financial', 'academic'
    status: { type: String, enum: ['active', 'resolved'], default: 'active' },
    description: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
  },
  { _id: false }
);

const AcademicRecordSchema = new mongoose.Schema(
  {
    subjectId: { type: String, required: true },
    grade: { type: Number, required: true },
    term: { type: String, required: true },
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

    studentId: { type: String, default: null },
    schoolEmail: { type: String, default: null },
    acceptanceLetterSeen: { type: Boolean, default: false },


    enrollmentType: { type: String, default: null },
    programId: { type: String, default: null },
    academicTerm: { type: String, default: null },
    yearLevel: { type: Number, default: 1 },
    academicRecord: { type: [AcademicRecordSchema], default: [] },
    holds: { type: [HoldSchema], default: [] },

    // Transferee-specific fields
    previousSchool: { type: String, default: '' },
    previousProgram: { type: String, default: '' },
    yearLevelAtTransfer: { type: String, default: '' },
    reasonForTransfer: { type: String, default: '' },
    unitsEarned: { type: String, default: '' },

    status: { 
      type: String, 
      enum: [
        'registration',
        'documents_submitted',
        'documents_approved',
        'documents_rejected',
        'advising_pending',
        'advising_approved',
        'advising_rejected',
        'payment_pending',
        'payment_confirmed',
        'validation_pending',
        'enrolled'
      ],
      default: 'registration' 
    },

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
    subjectChangeRequest: { type: String, default: '' },

    applicantPassword: { type: String, default: null },
    auditLogs: { type: [AuditLogSchema], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        delete ret.applicantPassword; // Exclude password from API responses
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

import bcrypt from 'bcryptjs';

StudentSchema.pre('save', async function (next) {
  if (!this.isModified('applicantPassword') || !this.applicantPassword) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.applicantPassword = await bcrypt.hash(this.applicantPassword, salt);
  next();
});

StudentSchema.methods.compareApplicantPassword = async function (enteredPassword) {
  if (!this.applicantPassword) return false;
  return await bcrypt.compare(enteredPassword, this.applicantPassword);
};

const Student = mongoose.model('Student', StudentSchema);
export default Student;
