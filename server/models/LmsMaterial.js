import mongoose from 'mongoose';

const LmsMaterialSchema = new mongoose.Schema(
  {
    offering: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseOffering', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    originalName: { type: String, required: true, trim: true },
    storageName: { type: String, required: true, trim: true, unique: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
    checksum: { type: String, default: '', trim: true, index: true },
  },
  { timestamps: true }
);

LmsMaterialSchema.index({ offering: 1, createdAt: -1 });

export default mongoose.model('LmsMaterial', LmsMaterialSchema);
