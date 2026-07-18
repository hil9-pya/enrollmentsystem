import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    activeTerm: { type: String, default: 'Fall 2026' },
    enrollmentOpen: { type: Boolean, default: true },
    systemMaintenance: { type: Boolean, default: false },
    announcement: { type: String, default: '' },
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
