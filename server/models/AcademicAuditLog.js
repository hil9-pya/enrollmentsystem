import mongoose from 'mongoose';

const AcademicAuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false }
);

AcademicAuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AcademicAuditLogSchema.index({ actor: 1, createdAt: -1 });

export default mongoose.model('AcademicAuditLog', AcademicAuditLogSchema);
