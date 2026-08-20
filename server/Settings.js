import mongoose from 'mongoose';
import { isValidAcademicTermLabel } from './academicTermUtils.js';

const settingsSchema = new mongoose.Schema(
  {
    activeTerm: {
      type: String,
      default: '1st Semester 2026-2027',
      validate: {
        validator: isValidAcademicTermLabel,
        message: 'Academic term must contain a valid semester and consecutive school years.',
      },
    },
    enrollmentOpen: { type: Boolean, default: true },
    systemMaintenance: { type: Boolean, default: false },
    announcement: { type: String, default: '' },
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
