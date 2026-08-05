import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Search, Pencil, Trash2, X, Save, Loader2,
  BookOpen, Users, ChevronDown, ChevronUp, RefreshCw,
  Calendar, Building2, GraduationCap,
} from 'lucide-react';

const PROGRAMS = [
  { id: 'bscs', label: 'BS Computer Science' },
  { id: 'bsba', label: 'BS Business Administration' },
  { id: 'bsn', label: 'BS Nursing' },
  { id: 'elective', label: 'General Electives' },
];

const DAYS_OPTIONS = ['MWF', 'TTH', 'MTWTHF', 'M', 'T', 'W', 'TH', 'F', 'S', 'TTHF'];
const ROOM_CODE_LENGTH = 4;
const ROOM_CODE_PATTERN = /^[12][1-3](?:0[1-9]|10)$/;
const SECTION_CODE_PATTERN = /^(CS|BA|NU)-[1-3]1[MAE][1-4]$/;
const PROGRAM_CODE_BY_ID = { bscs: 'CS', bsba: 'BA', bsn: 'NU' };
const YEAR_ORDINALS = { 1: '1st', 2: '2nd', 3: '3rd' };

function sanitizeRoomCode(value = '') {
  return value.replace(/\D/g, '').slice(0, ROOM_CODE_LENGTH);
}

function formatSectionCode(value = '') {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (compact.length < 3) return compact;
  return `${compact.slice(0, 2)}-${compact.slice(2)}`;
}

function getSectionCodeError(sectionCode, subject) {
  if (!sectionCode) return 'Enter a section code.';
  if (sectionCode.length > 4 && sectionCode[4] !== '1') {
    return 'This subject is for 1st semester only.';
  }
  if (!SECTION_CODE_PATTERN.test(sectionCode)) {
    return 'Use CS-11M1: program, year 1-3, semester 1, M/A/E, section 1-4.';
  }
  if (!subject || subject.programId === 'elective') return '';

  const expectedProgram = PROGRAM_CODE_BY_ID[subject.programId];
  if (sectionCode.slice(0, 2) !== expectedProgram) {
    return `Section code must use ${expectedProgram} for this subject.`;
  }
  if (Number(sectionCode[3]) !== subject.yearLevel) {
    return `Selected subject is for ${YEAR_ORDINALS[subject.yearLevel]} year only.`;
  }
  return '';
}

function SubjectFormModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
    id: '',
    code: '',
    name: '',
    units: 3,
    programId: '',
    fee: 4500,
    yearLevel: 1,
    semester: 1,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ id: '', code: '', name: '', units: 3, programId: '', fee: 4500, yearLevel: 1, semester: 1 });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <h3 className="text-base font-extrabold text-slate-900">Add New Subject</h3>
          <button onClick={onClose} className="p-2 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-7 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">ID (Unique) *</label>
              <input type="text" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s+/g, '') })} required placeholder="e.g. cs401" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Code *</label>
              <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="e.g. CS 401" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Subject Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Advanced AI" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Program *</label>
              <select value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value })} required className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">Select program...</option>
                {PROGRAMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Units *</label>
              <input type="number" value={form.units} onChange={(e) => setForm({ ...form, units: parseInt(e.target.value) || 3 })} required min={1} className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Only show Year Level & Semester if not an elective */}
          {form.programId && form.programId !== 'elective' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Year Level *</label>
                <select value={form.yearLevel} onChange={(e) => setForm({ ...form, yearLevel: parseInt(e.target.value) })} required className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">Select year...</option>
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Semester *</label>
                <select value={form.semester} onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value) })} required className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">Select semester...</option>
                  <option value={1}>1st Semester</option>
                  <option value={2}>2nd Semester</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Subject Fee (₱) *</label>
            <input type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: parseInt(e.target.value) || 0 })} required min={0} placeholder="e.g. 4500" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Time slot helpers ─────────────────────────────────────────────────────────
const TIME_SLOTS = [
  '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM',
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM',
];

const DAY_MAP = { M: 1, T: 2, W: 3, TH: 4, F: 5, S: 6 };

function parseDays(dayStr = '') {
  const d = dayStr.toUpperCase();
  const days = [];
  if (d.includes('TH')) days.push('TH');
  const rest = d.replace(/TH/g, '');
  for (const ch of rest) if (DAY_MAP[ch]) days.push(ch);
  return [...new Set(days)];
}

function parseHour(timeStr = '') {
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const meridian = m[3].toUpperCase();
  if (meridian === 'PM' && h !== 12) h += 12;
  if (meridian === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function timesOverlap(time1 = '', time2 = '') {
  const [s1, e1] = time1.split('-').map(t => parseHour(t?.trim()));
  const [s2, e2] = time2.split('-').map(t => parseHour(t?.trim()));
  if (s1 == null || e1 == null || s2 == null || e2 == null) return false;
  return s1 < e2 && s2 < e1;
}

function daysOverlap(days1 = '', days2 = '') {
  const d1 = parseDays(days1);
  const d2 = parseDays(days2);
  return d1.some(d => d2.includes(d));
}

function SectionFormModal({ isOpen, onClose, onSave, subjects, allSections, instructors, initialData }) {
  const [form, setForm] = useState({
    subjectId: '', sectionCode: '', days: 'MWF',
    startTime: '8:00 AM', endTime: '9:30 AM',
    room: '', instructor: '', instructorUser: '', maxSlots: 40, ...initialData,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // If initialData has a combined "time" field (e.g. "8:00 AM - 9:30 AM"), split it
      let startTime = '8:00 AM', endTime = '9:30 AM';
      if (initialData?.time) {
        const parts = initialData.time.split('-').map(t => t.trim());
        if (parts.length === 2) { startTime = parts[0]; endTime = parts[1]; }
      }
      setForm({
        subjectId: '', sectionCode: '', days: 'MWF',
        startTime, endTime, room: '', instructor: '', instructorUser: '', maxSlots: 40,
        ...initialData, time: undefined,
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedSubject = subjects.find((subject) => subject.id === form.subjectId);
    const sectionCodeError = getSectionCodeError(form.sectionCode, selectedSubject);
    if (sectionCodeError) {
      toast.error(sectionCodeError);
      return;
    }
    if (!roomCodeIsValid) {
      toast.error('Room must be a 4-digit code like 1101.');
      return;
    }
    setSaving(true);
    await onSave({ ...form, time: `${form.startTime} - ${form.endTime}` });
    setSaving(false);
  };

  // ── Live conflict detection ───────────────────────────────────────────────
  const roomConflicts = useMemo(() => {
    if (!form.room?.trim()) return [];
    return (allSections || []).filter(sec => {
      if (sec._id === initialData?.id) return false; // skip self when editing
      if (sec.room?.toLowerCase() !== form.room.toLowerCase()) return false;
      return daysOverlap(form.days, sec.days) &&
        timesOverlap(`${form.startTime} - ${form.endTime}`, sec.time);
    });
  }, [form.room, form.days, form.startTime, form.endTime, allSections, initialData]);

  const instructorConflicts = useMemo(() => {
    if (!form.instructor?.trim()) return [];
    return (allSections || []).filter(sec => {
      if (sec._id === initialData?.id) return false;
      if (!sec.instructor) return false;
      if (sec.instructor.toLowerCase() !== form.instructor.toLowerCase()) return false;
      return daysOverlap(form.days, sec.days) &&
        timesOverlap(`${form.startTime} - ${form.endTime}`, sec.time);
    });
  }, [form.instructor, form.days, form.startTime, form.endTime, allSections, initialData]);

  // All existing sections for same room (for the availability grid)
  const roomSchedule = useMemo(() => {
    if (!form.room?.trim()) return [];
    return (allSections || []).filter(sec =>
      sec.room?.toLowerCase() === form.room.toLowerCase() &&
      sec._id !== initialData?.id
    );
  }, [form.room, allSections, initialData]);

  const instructorSchedule = useMemo(() => {
    if (!form.instructor?.trim()) return [];
    return (allSections || []).filter(sec =>
      sec.instructor?.toLowerCase() === form.instructor.toLowerCase() &&
      sec._id !== initialData?.id
    );
  }, [form.instructor, allSections, initialData]);

  const roomCodeIsValid = !form.room?.trim()
    || form.room === initialData?.room
    || ROOM_CODE_PATTERN.test(form.room);

  const roomFormatError = !!form.room?.trim()
    && form.room !== initialData?.room
    && form.room.length === ROOM_CODE_LENGTH
    && !ROOM_CODE_PATTERN.test(form.room);

  const selectedSubject = subjects.find((subject) => subject.id === form.subjectId);
  const sectionCodeError = getSectionCodeError(form.sectionCode, selectedSubject);

  // Both room and instructor time conflicts block saving.
  // A teacher cannot teach two sections at the same time,
  // and a room cannot have two sections at the same time.
  const hasConflict = roomConflicts.length > 0 || instructorConflicts.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <h3 className="text-base font-extrabold text-slate-900">
            {initialData?.id ? 'Edit Section' : 'Add New Section'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-0 divide-x divide-slate-100">
          {/* ── Left: Form ── */}
          <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4 min-w-0">
            {/* Subject */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Subject *</label>
              <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                required disabled={!!initialData?.id}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                <option value="">Select a subject…</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </div>

            {/* Section Code */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Section Code *</label>
              <input
                type="text"
                value={form.sectionCode}
                onChange={(e) => setForm({ ...form, sectionCode: formatSectionCode(e.target.value) })}
                required
                maxLength={7}
                autoComplete="off"
                placeholder="e.g. CS-11M1"
                disabled={!!initialData?.id}
                className={`w-full px-3 py-2 text-xs border rounded-md font-mono focus:outline-none focus:ring-1 ${sectionCodeError && form.sectionCode ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 focus:ring-indigo-500'}`}
              />
              <p className={`mt-1 text-[10px] ${sectionCodeError && form.sectionCode ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>
                {sectionCodeError && form.sectionCode ? sectionCodeError : 'Format: CS-11M1. Semester is always 1; M, A, E; sections 1-4.'}
              </p>
            </div>

            {/* Days */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Days *</label>
              <select value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                {DAYS_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Start / End Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Start Time *</label>
                <select
                  value={form.startTime}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    const startMins = TIME_SLOTS.indexOf(newStart);
                    const endMins = TIME_SLOTS.indexOf(form.endTime);
                    // If end time is now at or before new start, bump it to next slot
                    const newEnd = endMins > startMins ? form.endTime : TIME_SLOTS[Math.min(startMins + 1, TIME_SLOTS.length - 1)];
                    setForm({ ...form, startTime: newStart, endTime: newEnd });
                  }}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">End Time *</label>
                <select
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
                  {/* Only show slots strictly after the selected start time */}
                  {TIME_SLOTS.filter(t => TIME_SLOTS.indexOf(t) > TIME_SLOTS.indexOf(form.startTime))
                    .map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Room */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Room</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={ROOM_CODE_LENGTH}
                value={form.room}
                onChange={(e) => setForm({ ...form, room: sanitizeRoomCode(e.target.value) })}
                placeholder="e.g. 1101"
                className={`w-full px-3 py-2 text-xs border rounded-md focus:outline-none focus:ring-1 ${
                  roomFormatError || roomConflicts.length > 0
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50'
                    : 'border-slate-200 focus:ring-indigo-500'
                }`}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                4 digits only. Format: building, floor, room. Example: 1101.
              </p>
              {roomFormatError && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">
                  Room code must follow BFRR: building 1-2, floor 1-3, room 01-10.
                </p>
              )}
              {roomConflicts.length > 0 && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">⚠ Room conflict with {roomConflicts.length} section(s)</p>
              )}
            </div>

            {/* Max Slots */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Max Slots</label>
              <input type="number" value={form.maxSlots} onChange={(e) => setForm({ ...form, maxSlots: parseInt(e.target.value) || 40 })}
                min={1} max={200}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            {/* Instructor */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Instructor</label>
              <select
                value={form.instructorUser || ''}
                onChange={(e) => {
                  const selected = instructors.find((user) => user._id === e.target.value);
                  setForm({
                    ...form,
                    instructorUser: e.target.value,
                    instructor: selected ? `${selected.firstName || ''} ${selected.lastName || ''}`.trim() : '',
                  });
                }}
                className={`w-full px-3 py-2 text-xs border rounded-md bg-white focus:outline-none focus:ring-1 ${instructorConflicts.length > 0 ? 'border-rose-400 focus:ring-rose-400 bg-rose-50' : 'border-slate-200 focus:ring-indigo-500'}`}
              >
                <option value="">No instructor assigned</option>
                {instructors.map((user) => (
                  <option key={user._id} value={user._id}>
                    {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username} ({user.email})
                  </option>
                ))}
              </select>
              {!form.instructorUser && form.instructor && (
                <p className="mt-1 text-[10px] text-amber-600">
                  Legacy text assignment: {form.instructor}. Select an account to enable Instructor Portal access.
                </p>
              )}
              {instructorConflicts.length > 0 && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">⚠ This instructor is already teaching {instructorConflicts.length} section(s) at this exact time &amp; day — cannot double-book.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={saving || hasConflict}
                className={`flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-md transition-colors cursor-pointer disabled:opacity-50 ${hasConflict ? 'bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {hasConflict ? 'Resolve Conflicts First' : saving ? 'Saving…' : 'Save Section'}
              </button>
            </div>
          </form>

          {/* ── Right: Availability Panel ── */}
          <div className="w-64 shrink-0 p-5 bg-slate-50/60 rounded-r-3xl space-y-4">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Live Availability</p>

            {/* Room Schedule */}
            {form.room?.trim() ? (
              <div>
                <p className="text-[10px] font-extrabold text-slate-700 mb-2 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {form.room}
                </p>
                {roomSchedule.length === 0 ? (
                  <p className="text-[10px] text-emerald-600 font-bold">✓ No existing bookings</p>
                ) : (
                  <div className="space-y-1.5">
                    {roomSchedule.map((sec) => {
                      const isConflict = roomConflicts.some(c => c._id === sec._id);
                      return (
                        <div key={sec._id} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold border ${isConflict ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                          <div className="font-extrabold">{sec.sectionCode}</div>
                          <div>{sec.days} · {sec.time}</div>
                          {isConflict && <div className="text-rose-500 font-extrabold">⚠ CONFLICT</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">Type a room name to see its schedule.</p>
            )}

            <div className="border-t border-slate-200" />

            {/* Instructor Schedule — conflicts block saving */}
            {form.instructor?.trim() ? (
              <div>
                <p className="text-[10px] font-extrabold text-slate-700 mb-1 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> {form.instructor}
                </p>
                <p className="text-[10px] text-slate-400 italic mb-2">Existing schedule</p>
                {instructorSchedule.length === 0 ? (
                  <p className="text-[10px] text-emerald-600 font-bold">✓ No existing classes</p>
                ) : (
                  <div className="space-y-1.5">
                    {instructorSchedule.map((sec) => {
                      const isConflict = instructorConflicts.some(c => c._id === sec._id);
                      return (
                        <div key={sec._id} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold border ${isConflict ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-600'}`}>
                          <div className="font-extrabold">{sec.sectionCode}</div>
                          <div>{sec.days} · {sec.time}</div>
                          {isConflict && <div className="text-rose-500 font-extrabold">⚠ CONFLICT</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">Type an instructor name to see their schedule.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CourseManagementTab() {
  const { confirm } = useConfirm();
  const { token: ctxToken, logout } = useAuth();

  const authFetch = useCallback((url, options = {}) => {
    // Use context token if available, otherwise fall back to localStorage
    const token = ctxToken || localStorage.getItem('token');
    return fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    });
  }, [ctxToken]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, secRes] = await Promise.all([
        authFetch('/api/scheduler/admin/subjects'),
        authFetch('/api/scheduler/admin/sections'),
      ]);
      const subData = await subRes.json();
      const secData = await secRes.json();
      const userRes = await authFetch('/api/admin/users');
      const userData = await userRes.json();
      if (subRes.status === 401 || secRes.status === 401 || userRes.status === 401) {
        toast.error('Session expired. Please sign in again.');
        logout();
        return;
      }
      if (!subRes.ok || !subData.success || !secRes.ok || !secData.success || !userRes.ok) {
        throw new Error(subData.message || secData.message || userData.message || 'Failed to load course data.');
      }
      setSubjects(subData.data);
      setSections(secData.data);
      setInstructors((userData || []).filter((user) => user.role === 'instructor'));
    } catch (error) {
      toast.error(error.message || 'Failed to load course data.');
    } finally {
      setLoading(false);
    }
  }, [authFetch, logout]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      if (programFilter && sub.programId !== programFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return sub.code?.toLowerCase().includes(q) || sub.name?.toLowerCase().includes(q);
    });
  }, [subjects, searchQuery, programFilter]);

  // Sections grouped by subject
  const sectionsBySubject = useMemo(() => {
    const map = new Map();
    sections.forEach((sec) => {
      if (!map.has(sec.subjectId)) map.set(sec.subjectId, []);
      map.get(sec.subjectId).push(sec);
    });
    return map;
  }, [sections]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveSection = async (form) => {
    const isEdit = !!editingSection?.id;
    const url = isEdit
      ? `/api/scheduler/admin/sections/${editingSection.id}`
      : '/api/scheduler/admin/sections';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await authFetch(url, { method, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to save section.');
        return;
      }
      toast.success(isEdit ? 'Section updated.' : 'Section created.');
      setModalOpen(false);
      setEditingSection(null);
      fetchData();
    } catch {
      toast.error('Network error.');
    }
  };

  const handleDeleteSection = async (section) => {
    const ok = await confirm({
      title: 'Delete Section',
      message: `Delete section "${section.sectionCode}"? This cannot be undone. Students currently enrolled in this section will not be automatically removed.`,
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;

    try {
      const res = await authFetch(`/api/scheduler/admin/sections/${section._id || section.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to delete.');
        return;
      }
      toast.success('Section deleted.');
      fetchData();
    } catch {
      toast.error('Network error.');
    }
  };

  const handleSaveSubject = async (form) => {
    try {
      const res = await authFetch('/api/scheduler/admin/subjects', { method: 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to create subject.');
        return;
      }
      toast.success('Subject created and added to catalog.');
      setSubjectModalOpen(false);
      fetchData();
    } catch {
      toast.error('Network error.');
    }
  };

  const openEdit = (section) => {
    setEditingSection({
      id: section._id || section.id,
      subjectId: section.subjectId,
      sectionCode: section.sectionCode,
      days: section.days,
      time: section.time,
      room: section.room,
      instructor: section.instructor,
      instructorUser: section.instructorUser?._id || section.instructorUser || '',
      maxSlots: section.maxSlots,
    });
    setModalOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 text-slate-400 gap-3 text-xs">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading course catalog…
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-200 p-4 sm:p-5 lg:p-6 h-full overflow-y-auto bg-slate-50">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Course and section management</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Manage section offerings. Room and instructor conflicts are validated on save.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSubjectModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors shadow-sm cursor-pointer"
            >
              <BookOpen className="w-4 h-4" /> Add Subject
            </button>
            <button
              onClick={() => { setEditingSection(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Section
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Subjects in Catalog', value: subjects.length, icon: <BookOpen className="w-4 h-4" />, color: 'indigo' },
            { label: 'Active Sections', value: sections.filter(s => s.isActive !== false).length, icon: <Calendar className="w-4 h-4" />, color: 'emerald' },
            { label: 'Total Enrolled Slots', value: sections.reduce((s, sec) => s + (sec.enrolledCount || 0), 0), icon: <Users className="w-4 h-4" />, color: 'amber' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-md bg-${stat.color}-100 text-${stat.color}-600 flex items-center justify-center mb-3`}>
                {stat.icon}
              </div>
              <div className="text-xl font-extrabold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subject code or name…"
              className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            className="text-xs font-semibold border border-slate-200 rounded-md px-3 py-2.5 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">All Programs</option>
            {PROGRAMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        {/* Subject → Sections accordion */}
        <div className="space-y-3">
          {filteredSubjects.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              No subjects found.
            </div>
          ) : (
            filteredSubjects.map((sub) => {
              const liveSections = sectionsBySubject.get(sub.id) || [];
              const isExpanded = expandedSubjectId === sub.id;
              const totalEnrolled = liveSections.reduce((s, sec) => s + (sec.enrolledCount || 0), 0);

              return (
                <div key={sub.id} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                  {/* Subject header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                    onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-indigo-50 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{sub.code}</span>
                          <span className="text-[10px] text-slate-400 font-extrabold">{sub.units} units</span>
                          <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                            {PROGRAMS.find((p) => p.id === sub.programId)?.label || sub.programId}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-800 leading-snug mt-0.5">{sub.name}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-slate-900">{liveSections.length} sections</div>
                        <div className="text-[10px] text-slate-400 font-medium">{totalEnrolled} enrolled</div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Sections table (expanded) */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      {liveSections.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400 font-medium">
                          No sections created yet for this subject.{' '}
                          <button
                            onClick={() => { setEditingSection({ subjectId: sub.id }); setModalOpen(true); }}
                            className="text-indigo-600 font-extrabold cursor-pointer hover:text-indigo-700"
                          >
                            Add one →
                          </button>
                        </div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                              <th className="text-left p-3 font-extrabold text-slate-400 uppercase tracking-wider">Section</th>
                              <th className="text-left p-3 font-extrabold text-slate-400 uppercase tracking-wider">Schedule</th>
                              <th className="text-left p-3 font-extrabold text-slate-400 uppercase tracking-wider">Room</th>
                              <th className="text-left p-3 font-extrabold text-slate-400 uppercase tracking-wider">Instructor</th>
                              <th className="text-center p-3 font-extrabold text-slate-400 uppercase tracking-wider">Slots</th>
                              <th className="text-right p-3 font-extrabold text-slate-400 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {liveSections.map((sec) => {
                              const remaining = sec.maxSlots - (sec.enrolledCount || 0);
                              const pct = Math.min(((sec.enrolledCount || 0) / sec.maxSlots) * 100, 100);
                              return (
                                <tr key={sec._id || sec.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-3 font-mono font-bold text-slate-800">{sec.sectionCode}</td>
                                  <td className="p-3 text-slate-600 font-mono">{sec.days} · {sec.time}</td>
                                  <td className="p-3 text-slate-500">{sec.room || '—'}</td>
                                  <td className="p-3 text-slate-500">{sec.instructor || '—'}</td>
                                  <td className="p-3">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className={`font-extrabold ${remaining === 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                        {sec.enrolledCount || 0}/{sec.maxSlots}
                                      </span>
                                      <div className="w-16 bg-slate-200 rounded-full h-1">
                                        <div
                                          className={`h-1 rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => openEdit(sec)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                        title="Edit"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSection(sec)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <SectionFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSection(null); }}
        onSave={handleSaveSection}
        subjects={subjects}
        allSections={sections}
        instructors={instructors}
        initialData={editingSection}
      />
      <SubjectFormModal
        isOpen={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        onSave={handleSaveSubject}
      />
    </>
  );
}
