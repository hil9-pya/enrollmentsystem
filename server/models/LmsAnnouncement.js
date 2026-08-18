import mongoose from 'mongoose';

const LmsAnnouncementSchema = new mongoose.Schema(
  {
    offering: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseOffering', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    isPinned: { type: Boolean, default: false },
    publishedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

LmsAnnouncementSchema.index({ offering: 1, isPinned: -1, publishedAt: -1 });

export default mongoose.model('LmsAnnouncement', LmsAnnouncementSchema);
