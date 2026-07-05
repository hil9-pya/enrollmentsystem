import React from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { SUBJECTS, PROGRAMS } from '../../../data/mockData';
import { Clock, CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export default function CourseEvaluationStep({ onNext, onBack }) {
  const { getActiveStudent } = useEnrollment();
  const student = getActiveStudent();

  const program = PROGRAMS.find((p) => p.id === student?.programId);
  const programSubjects = SUBJECTS.filter((s) => s.programId === student?.programId);

  const status = student?.status || 'registration';
  const isApproved = ['advising_approved', 'enrollment_pending', 'payment_pending', 'payment_confirmed', 'validation_pending', 'enrolled'].includes(status);

  // Helper to format prerequisites list
  const getPrereqsText = (prereqIds) => {
    if (!prereqIds || prereqIds.length === 0) return 'None';
    return prereqIds
      .map((id) => {
        const sub = SUBJECTS.find((s) => s.id === id);
        return sub ? sub.code : id;
      })
      .join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Course Evaluation & Eligibility</h2>
        <p className="text-sm text-slate-500 mb-6">
          Your program requirements and academic eligibility are reviewed by an Academic Adviser before subject selection.
        </p>

        {/* Status Indicator */}
        {!isApproved ? (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Evaluation Pending</h3>
              <p className="text-xs text-amber-700 mt-1">
                Your academic evaluation is currently pending. An academic adviser is reviewing your course prerequisites, records, and eligibility.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-6">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-emerald-800">Eligibility Approved</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Your eligibility has been officially approved by the Academic Adviser. You can now proceed to subject enrollment.
              </p>
              {student.adviserNotes && (
                <div className="mt-2 text-xs text-emerald-800 border-t border-emerald-200 pt-2 font-mono">
                  <span className="font-semibold uppercase tracking-wider">Adviser Notes:</span> {student.adviserNotes}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Program Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-200 rounded-md p-4 bg-slate-50 text-sm mb-6">
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase block">Selected Program</span>
            <span className="font-medium text-slate-950">{program ? program.name : 'Not selected'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase block">Department</span>
            <span className="font-medium text-slate-950">{program ? program.department : '-'}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase block">Admission Type</span>
            <span className="font-medium text-slate-950 uppercase">{student?.enrollmentType || '-'}</span>
          </div>
        </div>

        {/* Program Subject Matrix */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Core Program Requirements</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-700">Code</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Subject Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 text-center">Units</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Prerequisites</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {programSubjects.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                      No program details found. Please go back and select a program.
                    </td>
                  </tr>
                ) : (
                  programSubjects.map((sub) => {
                    const hasPrereq = sub.prerequisites && sub.prerequisites.length > 0;
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors duration-150">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">{sub.code}</td>
                        <td className="px-4 py-3 text-slate-900">{sub.name}</td>
                        <td className="px-4 py-3 text-center text-slate-900">{sub.units}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{getPrereqsText(sub.prerequisites)}</td>
                        <td className="px-4 py-3">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                              <CheckCircle className="h-3.5 w-3.5" /> Eligible
                            </span>
                          ) : !hasPrereq ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                              <CheckCircle className="h-3.5 w-3.5" /> Eligible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
                              <AlertCircle className="h-3.5 w-3.5" /> Pending Review
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>

        <button
          onClick={onNext}
          disabled={!isApproved}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-md transition-colors ${
            isApproved
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isApproved ? 'Proceed to Subject Enrollment' : 'Awaiting Adviser Approval'} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
