import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { useConfirm } from '../../../context/ConfirmationContext';
import { toast } from 'react-hot-toast';
import {
  Search, AlertTriangle, ArrowLeft, ArrowRight, Trash2, BookOpen,
  Clock, CheckCircle, Calendar, Lock, Loader2, Info, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import SearchInput from '../../../components/SearchInput';
import Modal from '../../../components/Modal';
import ScheduleGrid from '../../../components/ScheduleGrid';
import { ACADEMIC_TERMS } from '../../../data/mockData';

// ─── View Modes ──────────────────────────────────────────────────────────────
const VIEW_LIST = 'list';
const VIEW_GRID = 'grid';
const VIEW_REVIEW = 'review';

// ─── Schedule Conflict Helpers ────────────────────────────────────────────────
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
  const [s1, e1] = time1.split('-').map((t) => parseHour(t?.trim()));
  const [s2, e2] = time2.split('-').map((t) => parseHour(t?.trim()));
  if (s1 == null || e1 == null || s2 == null || e2 == null) return false;
  return s1 < e2 && s2 < e1;
}

function daysOverlap(days1 = '', days2 = '') {
  const d1 = parseDays(days1);
  const d2 = parseDays(days2);
  return d1.some((d) => d2.includes(d));
}

function getScheduleConflict(targetSubjectId, targetSection, selectedSubjects, subjects, getSubjectById) {
  if (!targetSection) return null;
  const targetSched = targetSection.schedule || { day: targetSection.days, time: targetSection.time };
  if (!targetSched || !targetSched.day || !targetSched.time) return null;

  for (const item of selectedSubjects) {
    if (item.subjectId === targetSubjectId) continue;
    const sub = subjects.find((s) => s.id === item.subjectId) || getSubjectById(item.subjectId);
    if (!sub) continue;
    const sec = (sub.sections || []).find((x) => x.id === item.sectionId);
    if (!sec) continue;
    const secSched = sec.schedule || { day: sec.days, time: sec.time };

    if (daysOverlap(targetSched.day, secSched.day) && timesOverlap(targetSched.time, secSched.time)) {
      return `${sub.code} (${sec.code} · ${secSched.day} ${secSched.time})`;
    }
  }
  return null;
}

function slotBadge(remaining, maxSlots) {
  if (remaining <= 0) return { label: 'FULL', cls: 'bg-rose-50 text-rose-600 border-rose-100' };
  if (remaining / maxSlots <= 0.2) return { label: `${remaining} slots left`, cls: 'bg-amber-50 text-amber-600 border-amber-150' };
  return { label: `${remaining} slots left`, cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SubjectEnrollmentStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch, getSubjectById, settings } = useEnrollment();
  const { confirm } = useConfirm();
  const student = getActiveStudent();

  // ── State ──────────────────────────────────────────────────────────────────
  const [view, setView] = useState(VIEW_LIST);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'curriculum' | 'elective'
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestText, setRequestText] = useState('');

  const studentId = student?._id || student?.id;
  const selectedSubjects = student?.selectedSubjects || [];
  const academicTermLabel = ACADEMIC_TERMS.find((term) => term.id === student?.academicTerm)?.label || student?.academicTerm;

  // ── Fetch curriculum subjects from API ────────────────────────────────────
  const fetchSubjects = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await fetch(`/api/scheduler/${studentId}/subjects`);
      const data = await res.json();
      if (data.success) setSubjects(data.data || []);
    } catch {
      toast.error('Failed to load subjects.');
    } finally {
      setLoadingSubjects(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const filteredSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      if (filterType === 'curriculum' && sub.isElective) return false;
      if (filterType === 'elective' && !sub.isElective) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        sub.code?.toLowerCase().includes(q) ||
        sub.name?.toLowerCase().includes(q) ||
        sub.sections?.some(
          (s) =>
            s.instructor?.toLowerCase().includes(q) ||
            s.code?.toLowerCase().includes(q)
        )
      );
    });
  }, [subjects, searchQuery, filterType]);

  const totalUnits = useMemo(() => {
    return selectedSubjects.reduce((sum, s) => {
      const sub = subjects.find((x) => x.id === s.subjectId) || getSubjectById(s.subjectId);
      return sum + (sub?.units || 0);
    }, 0);
  }, [selectedSubjects, subjects, getSubjectById]);

  const unitLimit = student?.overloadPermit ? 21 : 18;

  // Build rich entries for ScheduleGrid
  const gridEntries = useMemo(() => {
    return selectedSubjects
      .map((s) => {
        const sub = subjects.find((x) => x.id === s.subjectId) || getSubjectById(s.subjectId);
        if (!sub) return null;
        const sec = (sub.sections || []).find(
          (x) => x.id === s.sectionId || x._id === s.sectionId
        );
        if (!sec) return null;
        const schedule = sec.schedule || { day: sec.days, time: sec.time, room: sec.room };
        return {
          subjectId: sub.id,
          subjectCode: sub.code,
          subjectName: sub.name,
          sectionCode: sec.code,
          schedule,
        };
      })
      .filter(Boolean);
  }, [selectedSubjects, subjects, getSubjectById]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectSection = async (subjectId, sectionId) => {
    if (!studentId) return;
    setAddingId(sectionId);
    try {
      const res = await fetch(`/api/scheduler/${studentId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, sectionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Could not add section.');
      } else {
        // Update local student record through context
        await dispatch({ type: 'SET_SELECTED_SUBJECTS', payload: data.data });
        toast.success('Section added.');
        // Refresh subjects to pick up live slot counts
        fetchSubjects();
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveSubject = async (subjectId) => {
    if (!studentId) return;
    setRemovingId(subjectId);
    try {
      const res = await fetch(`/api/scheduler/${studentId}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Could not remove section.');
      } else {
        await dispatch({ type: 'SET_SELECTED_SUBJECTS', payload: data.data });
        toast.success('Section removed.');
        fetchSubjects();
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleProceedToPayment = async () => {
    if (view !== VIEW_REVIEW) {
      setView(VIEW_REVIEW);
      return;
    }

    // Final submission
    setSubmitting(true);
    try {
      const res = await fetch(`/api/scheduler/${studentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to finalize schedule.');
        setView(VIEW_LIST);
      } else {
        toast.success('Schedule finalized!');
        await dispatch({ type: 'PROCEED_TO_PAYMENT' });
        onNext();
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestText.trim()) {
      toast.error('Please enter your change request details.');
      return;
    }
    setSubmitting(true);
    try {
      await dispatch({
        type: 'UPDATE_ACTIVE_STUDENT',
        payload: {
          subjectChangeRequest: requestText.trim(),
          status: 'advising_pending',
        },
      });
      toast.success('Request sent to Academic Adviser!');
      setShowRequestModal(false);
      setRequestText('');
    } catch (err) {
      toast.error('Failed to send request: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const getSelectedForSubject = (subjectId) =>
    selectedSubjects.find((s) => s.subjectId === subjectId);

  const isSectionSelected = (subjectId, sectionId) =>
    selectedSubjects.some((s) => s.subjectId === subjectId && s.sectionId === sectionId);

  // ── REVIEW VIEW ───────────────────────────────────────────────────────────
  if (view === VIEW_REVIEW) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-premium">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-heading font-extrabold text-univ-navy">Review Your Schedule</h2>
              <p className="text-sm text-slate-500 font-medium">Confirm the schedule below. This will be finalized upon submission.</p>
            </div>
          </div>

          {/* Summary table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left p-3 font-extrabold text-slate-500 uppercase tracking-wider">Subject</th>
                  <th className="text-left p-3 font-extrabold text-slate-500 uppercase tracking-wider">Section</th>
                  <th className="text-left p-3 font-extrabold text-slate-500 uppercase tracking-wider">Schedule</th>
                  <th className="text-left p-3 font-extrabold text-slate-500 uppercase tracking-wider">Room</th>
                  <th className="text-center p-3 font-extrabold text-slate-500 uppercase tracking-wider">Units</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedSubjects.map((s) => {
                  const sub = subjects.find((x) => x.id === s.subjectId) || getSubjectById(s.subjectId);
                  if (!sub) return null;
                  const sec = (sub.sections || []).find(
                    (x) => x.id === s.sectionId || x._id === s.sectionId
                  );
                  const sched = sec?.schedule || { day: sec?.days, time: sec?.time, room: sec?.room };
                  return (
                    <tr key={s.subjectId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-extrabold text-univ-navy">{sub.code}</div>
                        <div className="text-slate-500 font-medium mt-0.5">{sub.name}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700">{sec?.code || '—'}</td>
                      <td className="p-3 font-mono text-slate-600">
                        {sched.day || '—'} · {sched.time || '—'}
                      </td>
                      <td className="p-3 text-slate-500">{sched.room || '—'}</td>
                      <td className="p-3 text-center font-extrabold text-univ-navy">{sub.units}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={4} className="p-3 font-extrabold text-slate-700">Total Units</td>
                  <td className="p-3 text-center font-extrabold text-lg text-univ-navy">{totalUnits}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Visual grid */}
          <div className="mb-6">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3">Weekly View</h3>
            <ScheduleGrid entries={gridEntries} />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <button
              onClick={() => setView(VIEW_LIST)}
              className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-extrabold text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              ← Edit Schedule
            </button>
            <button
              onClick={handleProceedToPayment}
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer bg-univ-blue text-white hover:bg-blue-700 shadow-univ-blue/20 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Finalizing...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Confirm & Proceed to Payment</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-premium">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading font-extrabold text-univ-navy mb-1">Subject Enrollment</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Select subjects and sections for your curriculum.
              {academicTermLabel && (
                <span className="ml-1 font-extrabold text-univ-blue">{academicTermLabel}</span>
              )}
            </p>
          </div>
          {/* View toggle */}
          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setView(VIEW_LIST)}
              className={`px-3 py-2 text-[10px] font-extrabold transition-colors cursor-pointer ${view === VIEW_LIST ? 'bg-univ-blue text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              List
            </button>
            <button
              onClick={() => setView(VIEW_GRID)}
              className={`px-3 py-2 text-[10px] font-extrabold transition-colors cursor-pointer ${view === VIEW_GRID ? 'bg-univ-blue text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Grid
            </button>
          </div>
        </div>

        {/* Change request banner */}
        {student?.subjectChangeRequest && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3 items-start shadow-sm">
            <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-extrabold text-amber-900 uppercase tracking-wider block mb-1">Subject Modification Request Pending</span>
              <p className="text-amber-800 font-mono italic">"{student.subjectChangeRequest}"</p>
            </div>
          </div>
        )}

        {view === VIEW_GRID ? (
          /* Grid only view */
          <ScheduleGrid entries={gridEntries} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* ── Left: Subject List ── */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search subject code, name, or instructor..."
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-[10px] font-extrabold border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-univ-blue cursor-pointer"
                >
                  <option value="all">All Subjects</option>
                  <option value="curriculum">Curriculum Only</option>
                  <option value="elective">Electives Only</option>
                </select>
              </div>

              {loadingSubjects ? (
                <div className="flex items-center justify-center py-16 gap-3 text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading your curriculum...
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div className="border border-slate-200 border-dashed rounded-xl p-8 text-center text-slate-400">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold">No subjects found.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                  {filteredSubjects.map((sub) => {
                    const selectedEntry = getSelectedForSubject(sub.id);
                    const isSelected = !!selectedEntry;
                    const isCompleted = sub.completed;
                    const prereqBlocked = !sub.prereqSatisfied && !isCompleted;
                    const isExpanded = expandedSubjectId === sub.id;

                    return (
                      <div
                        key={sub.id}
                        className={`border rounded-2xl transition-all duration-200 ${
                          isCompleted
                            ? 'border-slate-200 bg-slate-50/50 opacity-60'
                            : prereqBlocked
                            ? 'border-slate-200 bg-slate-50/30 opacity-75'
                            : isSelected
                            ? 'border-indigo-200 bg-indigo-50/30 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                        }`}
                      >
                        {/* Subject header — click to expand/collapse */}
                        <div
                          className="flex justify-between items-center p-4 cursor-pointer"
                          onClick={() =>
                            !isCompleted && !prereqBlocked &&
                            setExpandedSubjectId(isExpanded ? null : sub.id)
                          }
                        >
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono text-[10px] font-extrabold text-univ-navy bg-slate-100 px-2 py-0.5 rounded-md">
                                {sub.code}
                              </span>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                                {sub.units} Units
                              </span>
                            </div>
                            <h4 className="text-sm font-extrabold text-univ-navy leading-snug">{sub.name}</h4>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isCompleted && (
                              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Completed
                              </span>
                            )}
                            {prereqBlocked && (
                              <span
                                title={`Missing: ${sub.missingPrereqNames?.join(', ')}`}
                                className="text-[9px] font-extrabold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg flex items-center gap-1"
                              >
                                <Lock className="w-3 h-3" /> Prereq
                              </span>
                            )}
                            {isSelected && !isCompleted && !prereqBlocked && (
                              <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Enrolled
                              </span>
                            )}
                            {!isCompleted && !prereqBlocked && (
                              isExpanded
                                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                : <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Prereq warning */}
                        {prereqBlocked && (
                          <div className="px-4 pb-3 flex items-start gap-2 text-xs text-amber-700 font-medium">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Prerequisite not met: <strong>{sub.missingPrereqNames?.join(', ')}</strong></span>
                          </div>
                        )}

                        {/* Sections list (expanded) */}
                        {isExpanded && !isCompleted && !prereqBlocked && (
                          <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2.5">
                            {(sub.sections || []).map((sec) => {
                              const remaining = (sec.maxSlots ?? 40) - (sec.enrolledCount ?? 0);
                              const badge = slotBadge(remaining, sec.maxSlots ?? 40);
                              const isCurrent = isSectionSelected(sub.id, sec.id);
                              const isFull = remaining <= 0;
                              const isLoading = addingId === sec.id;
                              const conflictMsg = getScheduleConflict(sub.id, sec, selectedSubjects, subjects, getSubjectById);

                              return (
                                <div
                                  key={sec.id}
                                  className={`flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3 rounded-xl border transition-all ${
                                    isCurrent
                                      ? 'border-emerald-400/40 bg-emerald-50/50'
                                      : conflictMsg
                                      ? 'border-rose-200 bg-rose-50/30'
                                      : 'border-slate-100 bg-slate-50/40'
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                        {sec.code}
                                      </span>
                                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${badge.cls}`}>
                                        {badge.label}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-mono font-medium">
                                      {(sec.schedule?.day || sec.days)} · {(sec.schedule?.time || sec.time)} · {(sec.schedule?.room || sec.room)}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      {sec.instructor}
                                    </p>
                                    {conflictMsg && (
                                      <p className="text-[10px] text-rose-600 font-extrabold flex items-center gap-1 mt-0.5">
                                        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                        <span>Schedule Conflict: {conflictMsg}</span>
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => !isCurrent && !isFull && !conflictMsg && handleSelectSection(sub.id, sec.id)}
                                    disabled={isCurrent || isFull || isLoading || !!conflictMsg}
                                    className={`self-end sm:self-auto px-4 py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                      isCurrent
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 pointer-events-none'
                                        : isFull
                                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                        : conflictMsg
                                        ? 'bg-rose-100 border-rose-200 text-rose-600 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'
                                        : 'bg-univ-blue border-univ-blue text-white hover:bg-blue-700 hover:shadow-md'
                                    }`}
                                    title={conflictMsg ? `Schedule conflict with ${conflictMsg}` : ''}
                                  >
                                    {isLoading ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : isCurrent ? (
                                      'Selected'
                                    ) : isFull ? (
                                      'Full'
                                    ) : conflictMsg ? (
                                      'Conflict'
                                    ) : isSelected ? (
                                      'Switch'
                                    ) : (
                                      'Enroll'
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Right: Selected Subjects Panel ── */}
            <div className="lg:col-span-2 border border-slate-200 rounded-2xl p-5 bg-slate-50/50 flex flex-col min-h-[400px]">
              <h3 className="text-xs font-extrabold text-univ-navy uppercase tracking-wider border-b border-slate-200 pb-2.5 mb-4">
                Selected Course Load
              </h3>

              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 mb-4">
                {selectedSubjects.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-12 font-medium leading-relaxed">
                    No subjects added yet.<br />Click a subject above to see its sections.
                  </div>
                ) : (
                  selectedSubjects.map((s) => {
                    const sub = subjects.find((x) => x.id === s.subjectId) || getSubjectById(s.subjectId);
                    if (!sub) return null;
                    const sec = (sub.sections || []).find(
                      (x) => x.id === s.sectionId || x._id === s.sectionId
                    );
                    const sched = sec?.schedule || { day: sec?.days, time: sec?.time, room: sec?.room };
                    const isRemoving = removingId === s.subjectId;

                    return (
                      <div
                        key={s.subjectId}
                        className="flex justify-between items-center p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-univ-navy bg-slate-100 px-1.5 py-0.5 rounded">
                              {sec?.code || '—'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{sub.units}u</span>
                          </div>
                          <h5 className="text-xs font-extrabold text-univ-navy truncate mt-1">{sub.name}</h5>
                          <span className="text-[10px] text-slate-500 font-mono font-medium block truncate mt-0.5">
                            {sched.day || '—'} · {sched.time || '—'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveSubject(s.subjectId)}
                          disabled={isRemoving}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50 cursor-pointer disabled:opacity-50"
                        >
                          {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Unit summary */}
              <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-slate-500">
                  <span>Total Units:</span>
                  <span className={totalUnits > unitLimit ? 'text-rose-600 font-extrabold' : 'text-univ-navy'}>
                    {totalUnits} / {unitLimit} max
                  </span>
                </div>
                {totalUnits > 0 && (
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${totalUnits > unitLimit ? 'bg-rose-500' : totalUnits > 15 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((totalUnits / unitLimit) * 100, 100)}%` }}
                    />
                  </div>
                )}
                <div className="flex justify-between items-end font-bold text-univ-navy">
                  <span>Assessment Fee:</span>
                  <span className="text-base font-extrabold">
                    ₱{student?.totalTuition ? student.totalTuition.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                  </span>
                </div>
                {totalUnits > 18 && !student?.overloadPermit && (
                  <p className="text-[10px] text-rose-600 font-extrabold text-right uppercase tracking-wide">
                    Exceeds standard limit — overload permit required.
                  </p>
                )}
              </div>

              {/* Mini grid preview */}
              {selectedSubjects.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <button
                    onClick={() => setView(VIEW_GRID)}
                    className="w-full text-center text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    View Weekly Grid →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center mt-8 border-t border-slate-100 pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-extrabold text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          Back
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-5 py-3 bg-white border border-slate-200 hover:border-amber-300 text-xs font-extrabold text-slate-600 hover:text-amber-700 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Request Change
          </button>

          <button
            onClick={handleProceedToPayment}
            disabled={selectedSubjects.length === 0 || totalUnits > unitLimit}
            className={`flex items-center gap-2 px-8 py-3 text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer ${
              selectedSubjects.length > 0 && totalUnits <= unitLimit
                ? 'bg-univ-blue text-white hover:bg-blue-700 shadow-univ-blue/20 hover:shadow-lg hover:-translate-y-0.5'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Review Schedule ({selectedSubjects.length})
          </button>
        </div>
      </div>

      {/* Request Change Modal */}
      <Modal isOpen={showRequestModal} onClose={() => setShowRequestModal(false)} title="Request Subject Modification" maxWidth="max-w-md">
        <div className="space-y-4 text-left">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex gap-2.5 items-start text-xs font-semibold text-blue-800">
            <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Academic regulations restrict direct subject additions or drops. Your request will be forwarded to your Academic Adviser for authorization.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Advising Request Message</label>
            <textarea
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-univ-blue focus:border-transparent transition-all bg-white font-mono resize-none shadow-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setShowRequestModal(false)} className="px-6 py-2.5 text-xs font-extrabold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
              Cancel
            </button>
            <button onClick={handleSubmitRequest} className="px-6 py-2.5 text-xs font-extrabold text-white bg-univ-blue hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-md">
              Submit Request
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
