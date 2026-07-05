import React from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { PROGRAMS, ACADEMIC_TERMS } from '../../../data/mockData';

export default function ProgramSelectionStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const student = getActiveStudent();

  const selectedProgramId = student?.programId || '';
  const selectedTerm = student?.academicTerm || '';

  const selectedProgram = PROGRAMS.find((p) => p.id === selectedProgramId);

  function handleChange(field, value) {
    dispatch({
      type: 'SELECT_PROGRAM',
      payload: {
        programId: field === 'programId' ? value : selectedProgramId,
        academicTerm: field === 'academicTerm' ? value : selectedTerm,
      },
    });
  }

  const isComplete = selectedProgramId && selectedTerm;

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Program Selection</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        Choose your degree program and academic term.
      </p>

      <div className="space-y-5">
        {/* Degree Program */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Degree Program <span className="text-rose-600">*</span>
          </label>
          <select
            value={selectedProgramId}
            onChange={(e) => handleChange('programId', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors duration-150 bg-white"
          >
            <option value="">Select a program</option>
            {PROGRAMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.department}
              </option>
            ))}
          </select>
        </div>

        {/* Academic Term */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Academic Term <span className="text-rose-600">*</span>
          </label>
          <select
            value={selectedTerm}
            onChange={(e) => handleChange('academicTerm', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-colors duration-150 bg-white"
          >
            <option value="">Select a term</option>
            {ACADEMIC_TERMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Program Summary Card */}
      {selectedProgram && (
        <div className="bg-white border border-slate-200 rounded-md p-6 mt-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Program Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Program</p>
              <p className="font-medium text-slate-900">{selectedProgram.name}</p>
            </div>
            <div>
              <p className="text-slate-500">Department</p>
              <p className="font-medium text-slate-900">{selectedProgram.department}</p>
            </div>
            <div>
              <p className="text-slate-500">Total Units</p>
              <p className="font-medium text-slate-900">{selectedProgram.totalUnits}</p>
            </div>
            {selectedTerm && (
              <div>
                <p className="text-slate-500">Term</p>
                <p className="font-medium text-slate-900">
                  {ACADEMIC_TERMS.find((t) => t.id === selectedTerm)?.label}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-slate-600 hover:text-slate-900 transition-colors duration-150"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!isComplete}
          className={`px-6 py-2.5 rounded-md text-sm font-medium text-white transition-colors duration-150 ${
            isComplete
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-indigo-600 opacity-50 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
