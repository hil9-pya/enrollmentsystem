import React, { useState, useMemo } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { useConfirm } from '../../../context/ConfirmationContext';
import { SUBJECTS } from '../../../data/mockData';
import { checkScheduleConflict } from '../../../utils/scheduleUtils';
import { Search, AlertTriangle, ArrowLeft, ArrowRight, Trash2, BookOpen, Clock, CheckCircle } from 'lucide-react';
import SearchInput from '../../../components/SearchInput';
import Modal from '../../../components/Modal';

export default function SubjectEnrollmentStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch, getSubjectById } = useEnrollment();
  const { confirm } = useConfirm();
  const student = getActiveStudent();
  const [searchQuery, setSearchQuery] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestText, setRequestText] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  const programId = student?.programId;
  const selectedSubjects = student?.selectedSubjects || [];

  // Filter available subjects for the program
  const availableSubjects = useMemo(() => {
    if (!programId) return [];
    return SUBJECTS.filter((sub) => {
      if (sub.programId !== programId) return false;
      if (searchQuery.trim() === '') return true;
      const q = searchQuery.toLowerCase();
      return (
        sub.code.toLowerCase().includes(q) ||
        sub.name.toLowerCase().includes(q) ||
        (sub.instructor && sub.instructor.toLowerCase().includes(q))
      );
    });
  }, [programId, searchQuery]);

  // Compute conflicts
  const conflicts = useMemo(() => {
    const list = [];
    const len = selectedSubjects.length;
    for (let i = 0; i < len; i++) {
      const subA = getSubjectById(selectedSubjects[i].subjectId);
      if (!subA) continue;
      const secA = subA.sections?.find(s => s.id === selectedSubjects[i].sectionId);
      if (!secA) continue;

      for (let j = i + 1; j < len; j++) {
        const subB = getSubjectById(selectedSubjects[j].subjectId);
        if (!subB) continue;
        const secB = subB.sections?.find(s => s.id === selectedSubjects[j].sectionId);
        if (!secB) continue;

        if (checkScheduleConflict(secA.schedule, secB.schedule)) {
          list.push({ subA, secA, subB, secB });
        }
      }
    }
    return list;
  }, [selectedSubjects, getSubjectById]);

  const handleSelectSection = async (subjectId, sectionId) => {
    if (!student) return;
    try {
      await dispatch({
        type: 'ADD_SUBJECT',
        payload: { subjectId, sectionId },
      });
    } catch (err) {
      console.error('Failed to select section:', err);
    }
  };

  const handleRemoveSubject = async (subjectId) => {
    if (!student) return;
    try {
      await dispatch({
        type: 'REMOVE_SUBJECT',
        payload: { subjectId },
      });
    } catch (err) {
      console.error('Failed to remove subject:', err);
    }
  };

  const handleProceedToPayment = async () => {
    const isConfirmed = await confirm({
      title: 'Finalize Schedule',
      message: 'Are you sure you want to finalize your schedule and proceed to payment? Further changes to your schedule will require an adviser\'s approval.',
      confirmText: 'Yes, Proceed to Payment',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (isConfirmed) {
      try {
        await dispatch({ type: 'PROCEED_TO_PAYMENT' });
        onNext();
      } catch (err) {
        console.error('Failed to update student status:', err);
      }
    }
  };

  const isSectionSelected = (subjectId, sectionId) => {
    return selectedSubjects.some((s) => s.subjectId === subjectId && s.sectionId === sectionId);
  };

  const getSelectedSectionForSubject = (subjectId) => {
    return selectedSubjects.find((s) => s.subjectId === subjectId);
  };

  const totalUnits = useMemo(() => {
    return selectedSubjects.reduce((sum, s) => {
      const sub = getSubjectById(s.subjectId);
      return sum + (sub?.units || 0);
    }, 0);
  }, [selectedSubjects, getSubjectById]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-premium">
        <h2 className="text-2xl font-heading font-extrabold text-univ-navy mb-1.5">Subject Enrollment Matrix</h2>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
          Select courses for the upcoming term. You can enroll in up to 18 units. Please watch for schedule conflicts.
        </p>

        {student?.subjectChangeRequest && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4.5 mb-6 flex gap-3.5 items-start shadow-sm text-left">
            <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-extrabold text-amber-900 uppercase tracking-wider block">Subject Modification Request Pending</span>
              <p className="text-amber-800 leading-relaxed font-mono italic">
                "{student.subjectChangeRequest}"
              </p>
              <p className="text-[10px] text-amber-600 font-medium mt-1">
                Our academic advising staff has been notified and is reviewing your request. Modified subjects will be updated automatically once approved.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Panel: Available Subjects (60%) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider">Available Subjects</h3>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search code, subject name, or instructor..."
            />
 
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {availableSubjects.length === 0 ? (
                <div className="border border-slate-200 border-dashed rounded-xl p-8 text-center text-slate-400">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50 text-slate-400" />
                  <p className="text-xs font-bold text-slate-500">No subjects found</p>
                </div>
              ) : (
                availableSubjects.map((sub) => {
                  const selectedSection = getSelectedSectionForSubject(sub.id);
                  const isAnySectionSelected = !!selectedSection;

                  return (
                    <div
                      key={sub.id}
                      className={`border p-5 rounded-2xl transition-all duration-200 ${
                        isAnySectionSelected 
                          ? 'border-univ-blue/20 bg-univ-blue/[0.01] shadow-sm' 
                          : 'border-slate-200/80 bg-white hover:border-slate-350 shadow-sm'
                      }`}
                    >
                      {/* Subject Header */}
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-extrabold text-univ-navy bg-slate-150 px-2 py-0.5 rounded-md">
                              {sub.code}
                            </span>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">{sub.units} Units</span>
                          </div>
                          <h4 className="text-sm font-extrabold text-univ-navy mt-1.5 leading-snug">{sub.name}</h4>
                        </div>
                        {isAnySectionSelected && (
                          <span className="text-[10px] text-univ-blue font-extrabold bg-univ-blue/10 px-2 py-1 rounded-lg flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Section {selectedSection?.sectionId ? selectedSection.sectionId?.split('-')[1]?.toUpperCase() || 'A' : 'A'} Enrolled
                          </span>
                        )}
                      </div>

                      {/* Sections List */}
                      <div className="space-y-2.5">
                        {sub.sections?.map((sec) => {
                          const remainingSlots = sec.maxSlots - sec.enrolledCount;
                          const isCurrentSection = isSectionSelected(sub.id, sec.id);
                          const isLowSlots = remainingSlots < 5;
                          const isFull = remainingSlots <= 0;

                          return (
                            <div
                              key={sec.id}
                              className={`flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3 rounded-xl border transition-all ${
                                isCurrentSection
                                  ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                                  : 'border-slate-100 bg-slate-50/30'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                    Section {sec.code?.split('-')[1]?.toUpperCase() || 'A'}
                                  </span>
                                  <span
                                    className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                      isFull
                                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                        : isLowSlots
                                        ? 'bg-amber-50 text-amber-600 border border-amber-150'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                                    }`}
                                  >
                                    {isFull ? 'FULL' : `${remainingSlots} slots left`}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-mono font-medium">{sec.schedule.day} &bull; {sec.schedule.time} &bull; {sec.schedule.room}</p>
                                <p className="text-[10px] text-slate-400 font-medium">Instructor: {sec.instructor}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSelectSection(sub.id, sec.id)}
                                disabled={isCurrentSection || isFull}
                                className={`self-end sm:self-auto px-4 py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                                  isCurrentSection
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 pointer-events-none'
                                    : isFull
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                    : isAnySectionSelected
                                    ? 'bg-white border-univ-blue/30 text-univ-blue hover:bg-univ-blue hover:text-white hover:border-univ-blue'
                                    : 'bg-univ-blue border-univ-blue text-white hover:bg-blue-700 hover:shadow-md'
                                }`}
                              >
                                {isCurrentSection ? 'Selected' : isFull ? 'Closed' : isAnySectionSelected ? 'Switch' : 'Enroll'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
 
          {/* Right Panel: Selected Subjects (40%) */}
          <div className="lg:col-span-2 border border-slate-200/80 rounded-xl p-5 bg-slate-50/50 flex flex-col h-full min-h-[400px]">
            <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider border-b border-slate-200 pb-2.5 mb-4">
              Selected Course Load
            </h3>
 
            {/* Schedule conflicts alerts */}
            {conflicts.length > 0 && (
              <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-3.5 mb-4 space-y-2 shadow-sm text-left">
                <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-[10px] uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>Schedule Conflict Detected!</span>
                </div>
                <div className="text-[11px] text-rose-700 space-y-1 font-mono leading-relaxed font-medium">
                  {conflicts.map((conf, idx) => (
                    <div key={idx}>
                      &bull; {conf.secA.code} conflicts with {conf.secB.code} ({conf.secA.schedule.day} {conf.secA.schedule.time})
                    </div>
                  ))}
                </div>
              </div>
            )}
 
            {/* Selected items list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
              {selectedSubjects.length === 0 ? (
                <div className="text-center text-slate-400 text-xs py-16 font-medium leading-relaxed">
                  No subjects added yet. Select from the available list to create your schedule.
                </div>
              ) : (
                selectedSubjects.map((s) => {
                  const sub = getSubjectById(s.subjectId);
                  if (!sub) return null;
                  const sec = sub.sections?.find(x => x.id === s.sectionId);
                  if (!sec) return null;
                  return (
                    <div
                      key={s.subjectId}
                      className="flex justify-between items-center p-4 bg-white border border-slate-200/80 rounded-xl shadow-sm hover:border-slate-300 transition-all duration-200 text-left"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-univ-navy bg-slate-100 px-1.5 py-0.5 rounded">{sec?.code || 'A'}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{sub.units}u</span>
                        </div>
                        <h5 className="text-xs font-extrabold text-univ-navy truncate mt-1.5">{sub.name}</h5>
                        <span className="text-[10px] text-slate-500 block font-mono font-medium mt-0.5 truncate">
                          {sec?.schedule?.day} &bull; {sec?.schedule?.time} &bull; {sec?.schedule?.room}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveSubject(s.subjectId)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-2 rounded-lg hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
 
            {/* Calculations summaries */}
            <div className="border-t border-slate-200 pt-4 space-y-3 text-xs">
              <div className="flex justify-between font-bold text-slate-500">
                <span>Total Units:</span>
                <span className={totalUnits > 18 ? 'text-rose-600 font-extrabold' : 'text-univ-navy'}>
                  {totalUnits} / 18 units max
                </span>
              </div>
              <div className="flex justify-between items-end font-bold text-univ-navy">
                <span>Assessment Fee:</span>
                <span className="text-lg font-extrabold text-univ-navy">₱{student?.totalTuition ? student.totalTuition.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</span>
              </div>
              {totalUnits > 18 && (
                <p className="text-[10px] text-rose-600 font-extrabold text-right uppercase tracking-wide">
                  Warning: Credit load exceeds recommended limit.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
 
      {/* Control Buttons */}
      <div className="flex justify-between items-center mt-8 border-t border-slate-100 pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-extrabold text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          Back
        </button>
 
        <button
          onClick={handleProceedToPayment}
          disabled={selectedSubjects.length === 0 || totalUnits > 18 || conflicts.length > 0}
          className={`flex items-center gap-2 px-8 py-3 text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer ${
            selectedSubjects.length > 0 && totalUnits <= 18 && conflicts.length === 0
              ? 'bg-univ-blue text-white hover:bg-blue-700 shadow-univ-blue/20 hover:shadow-lg hover:-translate-y-0.5'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Proceed to Payment ({selectedSubjects.length} Courses)
        </button>
      </div>

      {/* Request Change Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="Request Subject Modification"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-left">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex gap-2.5 items-start text-xs font-semibold text-blue-800">
            <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Academic regulations restrict direct subject additions or drops. Your request will be forwarded to your Academic Adviser for authorization.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              Advising Request Message
            </label>
            <textarea
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-univ-blue focus:border-transparent transition-all bg-white font-mono resize-none shadow-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => setShowRequestModal(false)}
              className="px-6 py-2.5 text-xs font-extrabold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitRequest}
              className="px-6 py-2.5 text-xs font-extrabold text-white bg-univ-blue hover:bg-blue-700 rounded-xl transition-all cursor-pointer shadow-md shadow-univ-blue/20 hover:shadow-lg hover:-translate-y-0.5"
            >
              Submit Request to Staff
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
