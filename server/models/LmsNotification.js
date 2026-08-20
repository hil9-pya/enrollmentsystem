import mongoose from 'mongoose';

const LmsNotificationSchema = new mongoose.Schema(
  {
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    offering: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseOffering', required: true, index: true },
    type: {
      type: String,
      enum: ['announcement', 'material', 'assignment', 'submission', 'graded', 'returned'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    message: { type: String, default: '', trim: true, maxlength: 500 },
    tab: {
      type: String,
      enum: ['overview', 'announcements', 'materials', 'assignments', 'gradebook', 'roster'],
      default: 'overview',
    },
    sourceId: { type: String, default: '', trim: true },
    readAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

LmsNotificationSchema.index({ targetUser: 1, readAt: 1, createdAt: -1 });

export default mongoose.model('LmsNotification', LmsNotificationSchema);
