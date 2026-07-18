import React from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { PROGRAMS, ACADEMIC_TERMS, ACTIVE_TERM_ID } from '../../../data/mockData';
import { GraduationCap } from 'lucide-react';

export default function ContinuingEnrollmentStep({ onNext }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const student = getActiveStudent();

  const selectedProgramId = student?.programId || '';
  const selectedTerm = student?.academicTerm || '';

  const selectedProgram = PROGRAMS.find((p) => p.id === selectedProgramId);

  React.useEffect(() => {
    if (student && student.academicTerm !== ACTIVE_TERM_ID) {
      dispatch({
        type: 'SELECT_PROGRAM',
        payload: {
          programId: selectedProgramId,
          academicTerm: ACTIVE_TERM_ID,
        },
      });
    }
  }, [student?.academicTerm, selectedProgramId, dispatch]);
  function handleTermChange(value) {
    dispatch({
      type: 'SELECT_PROGRAM',
      payload: {
        programId: selectedProgramId,
        academicTerm: value,
      },
    });
  }

  const isComplete = selectedProgramId && selectedTerm;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-premium">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-univ-indigo/10 flex items-center justify-center text-univ-indigo">
          <GraduationCap className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-extrabold text-univ-navy">Continuing Enrollment</h1>
      </div>
      
      <p className="text-xs text-slate-500 mt-1 mb-8 leading-relaxed font-medium">
        Welcome back! Please verify your program details and select the upcoming academic term you wish to enroll in.
      </p>

      {/* Program Summary Card */}
      {selectedProgram && (
        <div className="bg-slate-50/40 border border-slate-200/60 rounded-xl p-5 mb-8 shadow-sm">
          <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Current Program Details</h3>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Program Course</p>
              <p className="text-xs font-bold text-univ-navy mt-1 leading-snug">{selectedProgram.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Department</p>
              <p className="text-xs font-bold text-univ-navy mt-1 leading-snug">{selectedProgram.department}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Curriculum Units</p>
              <p className="text-xs font-bold text-univ-navy mt-1 leading-snug">{selectedProgram.totalUnits} Units</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</p>
              <p className="text-xs font-bold text-emerald-600 mt-1 leading-snug">Active</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Academic Term */}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
            Active Academic Term
          </label>
          <div className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50/50 text-slate-700 font-medium">
            {ACADEMIC_TERMS.find((t) => t.id === ACTIVE_TERM_ID)?.label}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end mt-8 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={onNext}
          disabled={!isComplete}
          className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
            isComplete
              ? 'bg-univ-indigo hover:bg-univ-blue'
              : 'bg-slate-300 opacity-50 cursor-not-allowed'
          }`}
        >
          Continue to Subject Evaluation
        </button>
      </div>
    </div>
  );
}
