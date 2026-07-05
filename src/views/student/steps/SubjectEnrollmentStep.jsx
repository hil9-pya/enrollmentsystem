import React, { useState, useMemo } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { SUBJECTS } from '../../../data/mockData';
import { Search, AlertTriangle, ArrowLeft, ArrowRight, Trash2, BookOpen } from 'lucide-react';
import SearchInput from '../../../components/SearchInput';

export default function SubjectEnrollmentStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch, getSubjectById } = useEnrollment();
  const student = getActiveStudent();
  const [searchQuery, setSearchQuery] = useState('');

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
      for (let j = i + 1; j < len; j++) {
        const subB = getSubjectById(selectedSubjects[j].subjectId);
        if (!subB) continue;
        // Schedule day and time exact match check
        if (
          subA.schedule &&
          subB.schedule &&
          subA.schedule.day === subB.schedule.day &&
          subA.schedule.time === subB.schedule.time
        ) {
          list.push({ subA, subB });
        }
      }
    }
    return list;
  }, [selectedSubjects, getSubjectById]);

  const handleAddSubject = (subjectId) => {
    dispatch({ type: 'ADD_SUBJECT', payload: { subjectId } });
  };

  const handleRemoveSubject = (subjectId) => {
    dispatch({ type: 'REMOVE_SUBJECT', payload: { subjectId } });
  };

  const isSelected = (subjectId) => {
    return selectedSubjects.some((s) => s.subjectId === subjectId);
  };

  const totalUnits = useMemo(() => {
    return selectedSubjects.reduce((sum, s) => {
      const sub = getSubjectById(s.subjectId);
      return sum + (sub?.units || 0);
    }, 0);
  }, [selectedSubjects, getSubjectById]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-premium">
        <h2 className="text-xl font-extrabold text-univ-navy mb-1.5">Subject Enrollment Matrix</h2>
        <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium">
          Select courses for the upcoming term. You can enroll in up to 18 units. Please watch for schedule conflicts.
        </p>
 
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
                  const remainingSlots = sub.maxSlots - sub.enrolledCount;
                  const alreadySelected = isSelected(sub.id);
                  const isLowSlots = remainingSlots < 5;
 
                  return (
                    <div
                      key={sub.id}
                      className={`border p-4.5 rounded-xl transition-all duration-200 ${
                        alreadySelected 
                          ? 'border-univ-indigo bg-univ-indigo/[0.01] ring-1 ring-univ-indigo/10' 
                          : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-univ-navy bg-slate-100 px-2 py-0.5 rounded">
                              {sub.code}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{sub.units} Units</span>
                          </div>
                          <h4 className="text-xs font-extrabold text-univ-navy mt-2 leading-snug">{sub.name}</h4>
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">{sub.schedule.day} &bull; {sub.schedule.time} &bull; {sub.schedule.room}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Instructor: {sub.instructor}</p>
                        </div>
 
                        <div className="flex flex-col items-end gap-2.5 shrink-0">
                          <span
                            className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              isLowSlots 
                                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                                : 'bg-slate-50 text-slate-500 border border-slate-100'
                            }`}
                          >
                            {remainingSlots} slots left
                          </span>
 
                          <button
                            onClick={() => handleAddSubject(sub.id)}
                            disabled={alreadySelected || remainingSlots <= 0}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                              alreadySelected
                                ? 'bg-univ-indigo/10 border-univ-indigo/25 text-univ-indigo pointer-events-none'
                                : remainingSlots <= 0
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-univ-indigo hover:text-white hover:border-univ-indigo'
                            }`}
                          >
                            {alreadySelected ? 'Selected' : remainingSlots <= 0 ? 'Full' : 'Add Subject'}
                          </button>
                        </div>
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
              <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-3.5 mb-4 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-800 font-extrabold text-[10px] uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>Schedule Conflict Detected!</span>
                </div>
                <div className="text-[10px] text-rose-700 space-y-1 font-mono leading-relaxed">
                  {conflicts.map((conf, idx) => (
                    <div key={idx}>
                      &bull; {conf.subA.code} conflicts with {conf.subB.code} ({conf.subA.schedule.day} {conf.subA.schedule.time})
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
                  return (
                    <div
                      key={s.subjectId}
                      className="flex justify-between items-center p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-sm hover:border-slate-300 transition-all duration-200"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9px] font-bold text-univ-navy bg-slate-100 px-1.5 py-0.5 rounded">{sub.code}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{sub.units}u</span>
                        </div>
                        <h5 className="text-xs font-bold text-univ-navy truncate mt-1">{sub.name}</h5>
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5 truncate">
                          {sub.schedule.day} {sub.schedule.time}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveSubject(s.subjectId)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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
                <span className="text-base font-extrabold text-univ-navy">₱{student?.totalTuition ? student.totalTuition.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}</span>
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
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 rounded-lg transition-all cursor-pointer"
        >
          Back
        </button>
 
        <button
          onClick={onNext}
          disabled={selectedSubjects.length === 0 || totalUnits > 18 || conflicts.length > 0}
          className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer ${
            selectedSubjects.length > 0 && totalUnits <= 18 && conflicts.length === 0
              ? 'bg-univ-indigo text-white hover:bg-univ-blue'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Proceed to Payment ({selectedSubjects.length} Courses)
        </button>
      </div>
    </div>
  );
}
