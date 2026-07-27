import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // e.g. cs101, ge101
    code: { type: String, required: true }, // e.g. CS 101, GE 101
    name: { type: String, required: true }, // e.g. Intro to Computing
    units: { type: Number, required: true, min: 1 },
    programId: { type: String, required: true }, // e.g. bscs, bsba, bsn, elective
    fee: { type: Number, required: true, min: 0 },
    yearLevel: { type: Number, default: null }, // e.g. 1, 2, 3, 4 (null for electives)
    semester: { type: Number, default: null }, // e.g. 1, 2 (null for electives)
    prerequisites: { type: [String], default: [] }, // Array of subject IDs
  },
  { timestamps: true }
);

export default mongoose.model('Subject', SubjectSchema);
