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

  const autoSelected = React.useRef(false);

  React.useEffect(() => {
    if (student && student.academicTerm !== ACTIVE_TERM_ID && !autoSelected.current) {
      autoSelected.current = true;
      dispatch({
        type: 'SELECT_PROGRAM',
        payload: {
          programId: selectedProgramId,
          academicTerm: ACTIVE_TERM_ID,
        },
      }).finally(() => {
        setTimeout(() => { autoSelected.current = false; }, 1000);
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

      {/* Program Details & Change Course */}
      <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 mb-8 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider">Degree Program &amp; Course Details</h3>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Active</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-[10px] text-slate-500 font-extrabold uppercase tracking-wider mb-1">
              Selected Course / Program
            </label>
            <select
              value={selectedProgramId}
              onChange={(e) => {
                dispatch({
                  type: 'SELECT_PROGRAM',
                  payload: {
                    programId: e.target.value,
                    academicTerm: selectedTerm || ACTIVE_TERM_ID,
                  },
                });
              }}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-bold text-univ-navy bg-white focus:ring-2 focus:ring-univ-indigo focus:border-transparent outline-none cursor-pointer"
            >
              {PROGRAMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.department})
                </option>
              ))}
            </select>
          </div>
          {selectedProgram && (
            <>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Department</p>
                <p className="text-xs font-bold text-univ-navy mt-1 leading-snug">{selectedProgram.department}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Curriculum Units</p>
                <p className="text-xs font-bold text-univ-navy mt-1 leading-snug">{selectedProgram.totalUnits} Units</p>
              </div>
            </>
          )}
        </div>
      </div>

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
