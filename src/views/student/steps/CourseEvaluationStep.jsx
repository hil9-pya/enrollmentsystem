import React from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { SUBJECTS, PROGRAMS } from '../../../data/mockData';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Badge from '../../../components/Badge';

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
  const isAutoClearedFreshman = student?.enrollmentType === 'new' && isApproved;
  const passedSubjectIds = new Set(
    (student?.academicRecord || [])
      .filter((record) => Number(record.grade) <= 3.0)
      .map((record) => record.subjectId)
  );

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
        <h2 className="mb-1.5 text-xl font-semibold text-univ-navy">Course evaluation and eligibility</h2>
        <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium">
          {student?.enrollmentType === 'new'
            ? 'Your prescribed first-year curriculum is automatically prepared from your selected program.'
            : 'Your program requirements and academic eligibility are reviewed by an Academic Adviser before subject selection.'}
        </p>
 
        {/* Status Indicator */}
        {!program ? (
          <div className="flex flex-col gap-4 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider">Program Selection Required</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Select your program and academic term before an adviser can evaluate your eligibility.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="min-h-11 shrink-0 rounded-md bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
            >
              Select Program
            </button>
          </div>
        ) : status === 'advising_rejected' ? (
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
              <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                {isAutoClearedFreshman ? 'Prescribed Curriculum Cleared' : 'Eligibility Approved'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {isAutoClearedFreshman
                  ? 'As a regular freshman, you may proceed directly to section selection for your prescribed subjects. Adviser approval is only needed for exceptions or requested changes.'
                  : 'Your eligibility has been officially approved by the Academic Adviser. You can now proceed to subject enrollment.'}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border border-slate-200/80 rounded-lg p-4.5 bg-slate-50/50 text-xs mb-8">
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
                        const hasMetPrerequisites = !hasPrereq || sub.prerequisites.every(
                          (prerequisite) => passedSubjectIds.has(prerequisite)
                        );
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                            <td className="px-4 py-3.5 font-mono font-bold text-univ-navy bg-slate-50/30">{sub.code}</td>
                            <td className="px-4 py-3.5 font-semibold text-slate-700">{sub.name}</td>
                            <td className="px-4 py-3.5 text-center font-bold text-slate-600">{sub.units}</td>
                            <td className="px-4 py-3.5 text-slate-500 font-mono text-[10px]">{getPrereqsText(sub.prerequisites)}</td>
                            <td className="px-4 py-3.5">
                              {isApproved && hasMetPrerequisites ? (
                                <Badge tone="success">Eligible</Badge>
                              ) : !hasMetPrerequisites ? (
                                <Badge tone="warning">Prerequisite required</Badge>
                              ) : (
                                <Badge tone="neutral">Pending review</Badge>
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
          className="min-w-24 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 rounded-lg transition-colors cursor-pointer"
        >
          Back
        </button>
 
        {status === 'advising_rejected' ? (
          <button
            onClick={handleRequestReevaluation}
            className="min-w-24 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer bg-univ-blue text-white hover:bg-blue-700"
          >
            Request Re-evaluation
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={!isApproved || !program}
            className={`min-w-24 px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              isApproved && program
                ? 'bg-univ-blue text-white hover:bg-blue-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {!program
              ? 'Program Selection Required'
              : isApproved
              ? 'Proceed'
              : student?.enrollmentType === 'new'
              ? 'Preparing Prescribed Curriculum'
              : 'Awaiting Adviser Approval'}
          </button>
        )}
      </div>
    </div>
  );
}
