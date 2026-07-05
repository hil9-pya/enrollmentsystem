import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Course',
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'F', 'In Progress', 'Withdrawn'],
      default: 'In Progress',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a student can only enroll in a course once
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;