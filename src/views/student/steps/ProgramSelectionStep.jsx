import React from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { PROGRAMS, ACADEMIC_TERMS } from '../../../data/mockData';

export default function ProgramSelectionStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const student = getActiveStudent();

  const selectedProgramId = student?.programId || '';
  const selectedTerm = student?.academicTerm || '';

  const selectedProgram = PROGRAMS.find((p) => p.id === selectedProgramId);

  React.useEffect(() => {
    if (student && student.enrollmentType) {
      let expectedTerm = '';
      if (student.enrollmentType === 'new' || student.enrollmentType === 'transfer') {
        expectedTerm = '1s-2026';
      } else if (student.enrollmentType === 'returning' || student.enrollmentType === 'continuing') {
        expectedTerm = '2s-2026';
      }
      if (expectedTerm && student.academicTerm !== expectedTerm) {
        dispatch({
          type: 'SELECT_PROGRAM',
          payload: {
            programId: student.programId || '',
            academicTerm: expectedTerm,
          },
        });
      }
    }
  }, [student?.enrollmentType, student?.academicTerm, student?.programId, dispatch]);

  function handleChange(field, value) {
    dispatch({
      type: 'SELECT_PROGRAM',
      payload: {
        programId: field === 'programId' ? value : selectedProgramId,
        academicTerm: field === 'academicTerm' ? value : selectedTerm,
      },
    });
  }

  // 2nd Semester enrollments must go through Advising (Continue button disabled)
  const isComplete = selectedProgramId && selectedTerm && selectedTerm !== '2s-2026';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-premium">
      <h1 className="text-xl font-extrabold text-univ-navy">Program Selection</h1>
      <p className="text-xs text-slate-500 mt-1 mb-8 leading-relaxed font-medium">
        Choose your desired degree program and the academic term you wish to enroll in.
      </p>

      <div className="space-y-6">
        {/* Degree Program */}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
            Degree Program <span className="text-rose-600">*</span>
          </label>
          <select
            value={selectedProgramId}
            onChange={(e) => handleChange('programId', e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-univ-indigo focus:border-transparent outline-none transition-all bg-slate-50/50 focus:bg-white cursor-pointer"
          >
            <option value="">Select a program</option>
            {PROGRAMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.department})
              </option>
            ))}
          </select>
        </div>

        {/* Academic Term */}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
            Academic Term <span className="text-rose-600">*</span>
          </label>
          <select
            value={selectedTerm}
            onChange={(e) => handleChange('academicTerm', e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-univ-indigo focus:border-transparent outline-none transition-all bg-slate-50/50 focus:bg-white cursor-pointer"
          >
            <option value="">Select a term</option>
            {ACADEMIC_TERMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          {selectedTerm === '2s-2026' && (
            <div className="mt-4 p-4.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-850 text-xs font-semibold flex flex-col gap-2 shadow-sm">
              <span className="text-amber-900 font-extrabold text-xs uppercase tracking-wider">⚠️ Advising Action Required</span>
              <p className="leading-relaxed text-amber-900">
                Online self-enrollment is locked for second semester subjects. To enroll for second semesteral subjects, you must contact advising or the enrollment office to confide with and make changes.
              </p>
              <p className="text-[10px] text-amber-700">
                Please contact: <a href="mailto:advising@ncst.edu.ph" className="underline font-bold text-univ-indigo">advising@ncst.edu.ph</a> or visit the Advising Office on campus.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Program Summary Card */}
      {selectedProgram && (
        <div className="bg-slate-50/40 border border-slate-200/60 rounded-xl p-5 mt-8 shadow-sm">
          <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Program Details Summary</h3>
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
            {selectedTerm && (
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Semester Term</p>
                <p className="text-xs font-bold text-univ-navy mt-1 leading-snug">
                  {ACADEMIC_TERMS.find((t) => t.id === selectedTerm)?.label}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-8 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 rounded-lg transition-all cursor-pointer"
        >
          Back
        </button>
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
          Continue
        </button>
      </div>
    </div>
  );
}
