import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Search, Pencil, Trash2, Save, Loader2,
  BookOpen, Users, ChevronDown, ChevronUp,
  Calendar, Building2, GraduationCap,
} from 'lucide-react';
import PortalPageHeader from '../../components/PortalPageHeader';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import Modal from '../../components/Modal';

const PROGRAMS = [
  { id: 'bscs', label: 'BS Computer Science' },
  { id: 'bsba', label: 'BS Business Administration' },
  { id: 'bsn', label: 'BS Nursing' },
  { id: 'elective', label: 'General Electives' },
];

const DAYS_OPTIONS = ['MWF', 'TTH', 'MTWTHF', 'M', 'T', 'W', 'TH', 'F', 'S', 'TTHF'];
const ROOM_CODE_LENGTH = 4;
const ROOM_CODE_PATTERN = /^[12][1-3](?:0[1-9]|10)$/;
const SECTION_CODE_PATTERN = /^(CS|BA|NU|GE)-([1-4])([12])([MAE])([1-9])$/;
const PROGRAM_CODE_BY_ID = { bscs: 'CS', bsba: 'BA', bsn: 'NU', elective: 'GE' };
const SUBJECT_CODE_PATTERN = /^(CS|BA|NU|GE) \d{3}$/;
const YEAR_ORDINALS = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };

function sanitizeRoomCode(value = '') {
  return value.replace(/\D/g, '').slice(0, ROOM_CODE_LENGTH);
}

function formatSubjectCode(value = '') {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letters = compact.replace(/[^A-Z]/g, '').slice(0, 2);
  const digits = compact.replace(/\D/g, '').slice(0, 3);
  return `${letters}${digits ? ` ${digits}` : ''}`;
}

function sanitizeSubjectId(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
}

function formatSectionCode(value = '') {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  if (compact.length < 3) return compact;
  return `${compact.slice(0, 2)}-${compact.slice(2)}`;
}

function getSectionCodeError(sectionCode, subject) {
  if (!sectionCode) return 'Enter a section code.';
  const match = sectionCode.match(SECTION_CODE_PATTERN);
  if (!match) return 'Use CS-11M1: program, year 1-4, semester 1-2, M/A/E, section 1-9.';
  if (!subject) return '';

  const expectedProgram = PROGRAM_CODE_BY_ID[subject.programId];
  if (match[1] !== expectedProgram) {
    return `Section code must use ${expectedProgram} for this subject.`;
  }
  if (subject.yearLevel != null && Number(match[2]) !== Number(subject.yearLevel)) {
    return `Selected subject is for ${YEAR_ORDINALS[subject.yearLevel]} year only.`;
  }
  if (subject.semester != null && Number(match[3]) !== Number(subject.semester)) {
    return `Selected subject is for semester ${subject.semester} only.`;
  }
  return '';
}

function SubjectFormModal({ isOpen, onClose, onSave, subjects, initialData }) {
  const [form, setForm] = useState({
    id: '',
    code: '',
    name: '',
    units: 3,
    programId: '',
    fee: 4500,
    yearLevel: 1,
    semester: 1,
    prerequisites: [],
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [prerequisiteQuery, setPrerequisiteQuery] = useState('');

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (isOpen) {
      setPrerequisiteQuery('');
      setForm(initialData ? {
        id: initialData.id,
        code: initialData.code,
        name: initialData.name,
        units: initialData.units,
        programId: initialData.programId,
        fee: initialData.fee,
        yearLevel: initialData.yearLevel ?? 1,
        semester: initialData.semester ?? 1,
        prerequisites: initialData.prerequisites || [],
        isActive: initialData.isActive !== false,
      } : {
        id: '', code: '', name: '', units: 3, programId: '', fee: 4500,
        yearLevel: 1, semester: 1, prerequisites: [], isActive: true,
      });
    }
  }, [initialData, isOpen]);

  const prerequisiteOptions = useMemo(() => (subjects || []).filter((subject) => (
    subject.id !== form.id
    && (subject.isActive !== false || form.prerequisites.includes(subject.id))
  )), [form.id, form.prerequisites, subjects]);

  const filteredPrerequisiteOptions = useMemo(() => {
    const query = prerequisiteQuery.trim().toLowerCase();
    if (!query) return prerequisiteOptions;
    return prerequisiteOptions.filter((subject) => (
      subject.code?.toLowerCase().includes(query)
      || subject.name?.toLowerCase().includes(query)
    ));
  }, [prerequisiteOptions, prerequisiteQuery]);

  const togglePrerequisite = (subjectId) => {
    updateField(
      'prerequisites',
      form.prerequisites.includes(subjectId)
        ? form.prerequisites.filter((id) => id !== subjectId)
        : [...form.prerequisites, subjectId],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = String(form.code || '').trim().toUpperCase();
    const expectedCode = PROGRAM_CODE_BY_ID[form.programId];
    if (!SUBJECT_CODE_PATTERN.test(code)) {
      toast.error('Code must use this format: CS 401.');
      return;
    }
    if (expectedCode && !code.startsWith(`${expectedCode} `)) {
      toast.error(`Code must start with ${expectedCode} for the selected program.`);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        id: sanitizeSubjectId(form.id),
        code,
        units: Number(form.units),
        fee: Number(form.fee),
        yearLevel: form.programId === 'elective' ? null : Number(form.yearLevel),
        semester: form.programId === 'elective' ? null : Number(form.semester),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit subject' : 'Add new subject'} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="subject-id" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">ID (Unique) *</label>
              <input id="subject-id" name="id" type="text" value={form.id} onChange={(e) => updateField('id', sanitizeSubjectId(e.target.value))} required disabled={!!initialData} pattern="[a-z0-9-]+" maxLength={32} autoCapitalize="none" spellCheck="false" title="Use lowercase letters, numbers, and hyphens only." placeholder="e.g. cs401" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-500" />
            </div>
            <div>
              <label htmlFor="subject-code" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Code *</label>
              <input id="subject-code" name="code" type="text" value={form.code} onChange={(e) => updateField('code', formatSubjectCode(e.target.value))} required pattern={SUBJECT_CODE_PATTERN.source} maxLength={6} spellCheck="false" title="Use a course code such as CS 401." placeholder="e.g. CS 401" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <p className="mt-1 text-[11px] text-slate-500">Use two letters and three numbers; prefix must match the program.</p>
            </div>
          </div>
          <div>
            <label htmlFor="subject-name" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Subject Name *</label>
            <input id="subject-name" name="name" type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required placeholder="e.g. Advanced AI" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="subject-program" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Program *</label>
              <select id="subject-program" name="programId" value={form.programId} onChange={(e) => updateField('programId', e.target.value)} required className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="">Select program...</option>
                {PROGRAMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="subject-units" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Units *</label>
              <input id="subject-units" name="units" type="number" value={form.units} onChange={(e) => { const digits = e.target.value.replace(/\D/g, '').slice(0, 2); const normalized = digits.replace(/^0+(?=\d)/, ''); updateField('units', normalized && Number(normalized) > 30 ? '30' : normalized); }} required min={1} max={30} step={1} inputMode="numeric" title="Enter a whole number from 1 to 30." className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Only show Year Level & Semester if not an elective */}
          {form.programId && form.programId !== 'elective' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="subject-year-level" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Year Level *</label>
                <select id="subject-year-level" name="yearLevel" value={form.yearLevel} onChange={(e) => updateField('yearLevel', e.target.value)} required className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">Select year...</option>
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>
              <div>
                <label htmlFor="subject-semester" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Semester *</label>
                <select id="subject-semester" name="semester" value={form.semester} onChange={(e) => updateField('semester', e.target.value)} required className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">Select semester...</option>
                  <option value={1}>1st Semester</option>
                  <option value={2}>2nd Semester</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="subject-fee" className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Subject Fee (₱) *</label>
            <input id="subject-fee" name="fee" type="number" value={form.fee} onChange={(e) => updateField('fee', e.target.value)} required min={0} step="0.01" inputMode="decimal" placeholder="e.g. 4500" className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span id="subject-prerequisites-label" className="text-xs font-semibold text-slate-700">Prerequisites</span>
              <span className="text-[11px] text-slate-500" aria-live="polite">
                {form.prerequisites.length} selected
              </span>
            </div>
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white focus-within:border-univ-blue focus-within:ring-1 focus-within:ring-univ-blue">
              <div className="relative border-b border-slate-200 bg-slate-50">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="subject-prerequisites"
                  type="search"
                  value={prerequisiteQuery}
                  onChange={(event) => setPrerequisiteQuery(event.target.value)}
                  aria-labelledby="subject-prerequisites-label"
                  aria-describedby="subject-prerequisites-help"
                  placeholder="Search subject code or name"
                  className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              <div role="group" aria-labelledby="subject-prerequisites-label" className="max-h-40 overflow-y-auto p-1">
                {filteredPrerequisiteOptions.length === 0 ? (
                  <p className="px-3 py-5 text-center text-xs text-slate-500">
                    {prerequisiteOptions.length === 0 ? 'No available subjects.' : 'No matching subjects.'}
                  </p>
                ) : filteredPrerequisiteOptions.map((subject) => {
                  const isSelected = form.prerequisites.includes(subject.id);
                  return (
                    <label key={subject.id} className={`flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 hover:bg-slate-50 ${isSelected ? 'bg-blue-50/70' : ''}`}>
                      <input
                        type="checkbox"
                        name="prerequisites"
                        value={subject.id}
                        checked={isSelected}
                        onChange={() => togglePrerequisite(subject.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-univ-blue"
                      />
                      <span className="min-w-0 text-sm leading-5 text-slate-700">
                        <span className="font-mono text-xs font-semibold text-univ-navy">{subject.code}</span>
                        <span className="mx-1.5 text-slate-300">—</span>
                        <span>{subject.name}</span>
                        {subject.isActive === false && <span className="ml-2 text-xs text-slate-400">Inactive</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            <p id="subject-prerequisites-help" className="mt-1.5 text-[11px] text-slate-500">Select every subject students must complete first.</p>
          </div>

          {initialData && (
            <label htmlFor="subject-active" className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input id="subject-active" name="isActive" type="checkbox" checked={form.isActive} onChange={(e) => updateField('isActive', e.target.checked)} className="accent-univ-blue" />
              Active in current curriculum
            </label>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Subject'}
            </button>
          </div>
        </form>
    </Modal>
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
    if (form.instructor?.trim() && !form.instructorUser) {
      toast.error('Select a real instructor account or leave the section unassigned.');
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
    if (!form.instructorUser && !form.instructor?.trim()) return [];
    return (allSections || []).filter(sec => {
      if (sec._id === initialData?.id) return false;
      const sameAccount = form.instructorUser
        && (sec.instructorUser?._id || sec.instructorUser) === form.instructorUser;
      const sameLegacyName = !form.instructorUser
        && sec.instructor
        && sec.instructor.toLowerCase() === form.instructor.toLowerCase();
      if (!sameAccount && !sameLegacyName) return false;
      return daysOverlap(form.days, sec.days) &&
        timesOverlap(`${form.startTime} - ${form.endTime}`, sec.time);
    });
  }, [form.instructor, form.instructorUser, form.days, form.startTime, form.endTime, allSections, initialData]);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData?.id ? 'Edit section' : 'Add new section'}
      maxWidth="max-w-2xl"
    >
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
                <p className="mt-1 text-[10px] font-semibold text-amber-700">
                  Legacy assignment: {form.instructor}. Select its instructor account before saving, or choose no instructor.
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
    </Modal>
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
  const [editingSubject, setEditingSubject] = useState(null);

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
      toast.success(data.message || (isEdit ? 'Section updated.' : 'Section created.'));
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
      message: `Delete section "${section.sectionCode}"? This is allowed only when no students or official offerings use it.`,
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
      const isEdit = !!editingSubject?.id;
      const url = isEdit
        ? `/api/scheduler/admin/subjects/${editingSubject.id}`
        : '/api/scheduler/admin/subjects';
      const res = await authFetch(url, { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to save subject.');
        return;
      }
      toast.success(data.message || (isEdit ? 'Subject updated.' : 'Subject created.'));
      setSubjectModalOpen(false);
      setEditingSubject(null);
      fetchData();
    } catch {
      toast.error('Network error.');
    }
  };

  const handleArchiveSubject = async (subject) => {
    const ok = await confirm({
      title: 'Archive Subject',
      message: `Archive "${subject.code} — ${subject.name}"? It will no longer appear in enrollment or advising.`,
      confirmText: 'Archive',
      type: 'danger',
    });
    if (!ok) return;

    try {
      const res = await authFetch(`/api/scheduler/admin/subjects/${subject.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to archive subject.');
        return;
      }
      toast.success('Subject archived.');
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
        <PortalPageHeader
          title="Course and section management"
          description="Manage section offerings. Room and instructor conflicts are validated on save."
          actions={<>
            <PortalRefreshButton onRefresh={fetchData} />
            <button
              onClick={() => { setEditingSubject(null); setSubjectModalOpen(true); }}
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
          </>}
        />

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
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">{sub.code}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{sub.units} units</span>
                          <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
                            {PROGRAMS.find((p) => p.id === sub.programId)?.label || sub.programId}
                          </span>
                          {sub.isActive === false && <span className="text-[10px] font-semibold text-amber-700">Archived</span>}
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800 leading-snug mt-0.5">{sub.name}</h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); setEditingSubject(sub); setSubjectModalOpen(true); }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          aria-label={`Edit ${sub.code}`}
                          title="Edit subject"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {sub.isActive !== false && (
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); handleArchiveSubject(sub); }}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            aria-label={`Archive ${sub.code}`}
                            title="Archive subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-slate-900">{liveSections.length} sections</div>
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
                          {sub.isActive !== false && (
                            <button
                              onClick={() => { setEditingSection({ subjectId: sub.id }); setModalOpen(true); }}
                              className="text-indigo-600 font-semibold cursor-pointer hover:text-indigo-700"
                            >
                              Add one →
                            </button>
                          )}
                        </div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                              <th className="text-left p-3 font-semibold text-slate-500 uppercase tracking-wider">Section</th>
                              <th className="text-left p-3 font-semibold text-slate-500 uppercase tracking-wider">Schedule</th>
                              <th className="text-left p-3 font-semibold text-slate-500 uppercase tracking-wider">Room</th>
                              <th className="text-left p-3 font-semibold text-slate-500 uppercase tracking-wider">Instructor</th>
                              <th className="text-center p-3 font-semibold text-slate-500 uppercase tracking-wider">Slots</th>
                              <th className="text-right p-3 font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
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
                                  <td className="p-3">
                                    <div className="flex flex-col items-start gap-1">
                                      <span className="text-slate-600">{sec.instructor || 'TBA'}</span>
                                      {sec.instructorUser ? (
                                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                          Portal linked
                                        </span>
                                      ) : sec.instructor ? (
                                        <button
                                          type="button"
                                          onClick={() => openEdit(sec)}
                                          className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 hover:bg-amber-100"
                                          title="Link this legacy name to an instructor account"
                                        >
                                          Account required
                                        </button>
                                      ) : (
                                        <span className="text-[9px] font-semibold text-slate-400">Unassigned</span>
                                      )}
                                    </div>
                                  </td>
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
                                        type="button"
                                        onClick={() => openEdit(sec)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                        title="Edit section"
                                        aria-label={`Edit section ${sec.sectionCode}`}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSection(sec)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Delete section"
                                        aria-label={`Delete section ${sec.sectionCode}`}
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
        subjects={subjects.filter((subject) => subject.isActive !== false)}
        allSections={sections}
        instructors={instructors}
        initialData={editingSection}
      />
      <SubjectFormModal
        isOpen={subjectModalOpen}
        onClose={() => { setSubjectModalOpen(false); setEditingSubject(null); }}
        onSave={handleSaveSubject}
        subjects={subjects}
        initialData={editingSubject}
      />
    </>
  );
}
