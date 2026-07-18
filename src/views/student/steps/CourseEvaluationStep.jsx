import React from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { SUBJECTS, PROGRAMS } from '../../../data/mockData';
import { Clock, CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export default function CourseEvaluationStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const student = getActiveStudent();

  const program = PROGRAMS.find((p) => p.id === student?.programId);
  const programSubjects = SUBJECTS.filter((s) => s.programId === student?.programId);

  const groupedSubjects = programSubjects.reduce((acc, sub) => {
    const yl = sub.yearLevel || 1;
    if (!acc[yl]) acc[yl] = [];
    acc[yl].push(sub);
    return acc;
  }, {});
  const yearLevels = Object.keys(groupedSubjects).sort((a, b) => Number(a) - Number(b));

  const status = student?.status || 'registration';
  const isApproved = ['advising_approved', 'enrollment_pending', 'payment_pending', 'payment_confirmed', 'validation_pending', 'enrolled'].includes(status);

  const handleRequestReevaluation = async () => {
    try {
      await dispatch({
        type: 'UPDATE_ACTIVE_STUDENT',
        payload: { status: 'advising_pending' },
      });
    } catch (err) {
      console.error('Failed to request re-evaluation:', err);
    }
  };

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
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-premium">
        <h2 className="text-xl font-extrabold text-univ-navy mb-1.5">Course Evaluation &amp; Eligibility</h2>
        <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium">
          Your program requirements and academic eligibility are reviewed by an Academic Adviser before subject selection.
        </p>
 
        {/* Status Indicator */}
        {status === 'advising_rejected' ? (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200/50 rounded-xl p-4.5 mb-6">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider">Evaluation Returned</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Your academic evaluation requires changes before proceeding. Please review the notes from your Academic Adviser below.
              </p>
              {student.adviserNotes && (
                <div className="mt-3 text-xs text-rose-800 border-t border-rose-100 pt-3">
                  <span className="font-bold uppercase tracking-wider block text-[10px] text-rose-700 mb-1">Adviser Notes:</span>
                  <p className="font-mono bg-white/50 p-2.5 rounded-lg border border-rose-100/50 text-[11px]">{student.adviserNotes}</p>
                </div>
              )}
            </div>
          </div>
        ) : !isApproved ? (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/50 rounded-xl p-4.5 mb-6">
            <Clock className="h-5 w-5 text-univ-gold shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-univ-gold uppercase tracking-wider">Evaluation Pending</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Your academic evaluation is currently pending. An academic adviser is reviewing your course prerequisites, records, and eligibility.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200/50 rounded-xl p-4.5 mb-6">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Eligibility Approved</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Your eligibility has been officially approved by the Academic Adviser. You can now proceed to subject enrollment.
              </p>
              {student.adviserNotes && (
                <div className="mt-3 text-xs text-emerald-800 border-t border-emerald-100 pt-3">
                  <span className="font-bold uppercase tracking-wider block text-[10px] text-emerald-700 mb-1">Adviser Notes:</span>
                  <p className="font-mono bg-white/50 p-2.5 rounded-lg border border-emerald-100/50 text-[11px]">{student.adviserNotes}</p>
                </div>
              )}
            </div>
          </div>
        )}
 
        {/* Selected Program Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border border-slate-200/80 rounded-xl p-4.5 bg-slate-50/50 text-xs mb-8">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Selected Program</span>
            <span className="font-bold text-univ-navy mt-1 block">{program ? program.name : 'Not selected'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Department</span>
            <span className="font-bold text-univ-navy mt-1 block">{program ? program.department : '-'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Admission Type</span>
            <span className="font-bold text-univ-navy mt-1 block uppercase tracking-wide">{student?.enrollmentType || '-'}</span>
          </div>
        </div>
 
        {/* Program Subject Matrix */}
        <div>
          <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Core Program Requirements</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  <th className="px-4 py-3.5">Code</th>
                  <th className="px-4 py-3.5">Subject Name</th>
                  <th className="px-4 py-3.5 text-center">Units</th>
                  <th className="px-4 py-3.5">Prerequisites</th>
                  <th className="px-4 py-3.5">Eligibility Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {yearLevels.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-400 font-medium">
                      No program details found. Please go back and select a program.
                    </td>
                  </tr>
                ) : (
                  yearLevels.map((yl) => (
                    <React.Fragment key={yl}>
                      <tr className="bg-slate-100/50">
                        <td colSpan="5" className="px-4 py-2 text-xs font-extrabold text-univ-navy uppercase tracking-widest border-t border-b border-slate-200">
                          Year Level {yl}
                        </td>
                      </tr>
                      {groupedSubjects[yl].map((sub) => {
                        const hasPrereq = sub.prerequisites && sub.prerequisites.length > 0;
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                            <td className="px-4 py-3.5 font-mono font-bold text-univ-navy bg-slate-50/30">{sub.code}</td>
                            <td className="px-4 py-3.5 font-semibold text-slate-700">{sub.name}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-slate-600">{sub.units}</td>
                            <td className="px-4 py-3.5 text-slate-500 font-mono text-[10px]">{getPrereqsText(sub.prerequisites)}</td>
                            <td className="px-4 py-3.5">
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                                  Eligible
                                </span>
                              ) : !hasPrereq ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                                  Eligible
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-univ-gold bg-amber-50 px-2 py-0.5 rounded border border-univ-gold/15 uppercase tracking-wider">
                                  Pending Review
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
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
 
        {status === 'advising_rejected' ? (
          <button
            onClick={handleRequestReevaluation}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer bg-univ-indigo text-white hover:bg-univ-blue"
          >
            Request Re-evaluation
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={!isApproved}
            className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer ${
              isApproved
                ? 'bg-univ-indigo text-white hover:bg-univ-blue'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isApproved ? 'Proceed to Subject Enrollment' : 'Awaiting Adviser Approval'}
          </button>
        )}
      </div>
    </div>
  );
}
