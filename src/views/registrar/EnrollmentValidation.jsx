import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ShieldCheck, CheckCircle, FileText, Calendar, Receipt, Download } from 'lucide-react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useConfirm } from '../../context/ConfirmationContext';
import { SUBJECTS, PROGRAMS, REQUIRED_DOCUMENTS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import { authFetch } from '../../utils/authFetch.js';

function formatPeso(amount) {
  if (amount == null) return '₱0';
  return '₱' + amount.toLocaleString('en-PH');
}

export default function EnrollmentValidation({ studentId, onBack }) {
  const { dispatch, getStudentById, refreshStudents } = useEnrollment();
  const { confirm } = useConfirm();
  const [flashMessage, setFlashMessage] = useState(null);
  const [resolvedSchedule, setResolvedSchedule] = useState([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState('');

  const student = getStudentById(studentId);
  const program = student ? PROGRAMS.find(p => p.id === student.programId) : null;

  const selectedSubjectDetails = useMemo(() => {
    if (!student) return [];
    return student.selectedSubjects
      .map((ss) => {
        const sub = SUBJECTS.find((s) => s.id === ss.subjectId);
        if (!sub) return null;
        const sec = sub.sections?.find((x) => x.id === ss.sectionId);
        return {
          id: ss.subjectId,
          code: sec ? sec.code : sub.code,
          name: sub.name,
          units: sub.units,
          schedule: sec ? sec.schedule : { day: '—', time: '—' },
        };
      })
      .filter(Boolean);
  }, [student]);

  const selectedSubjectsKey = JSON.stringify(student?.selectedSubjects || []);
  const loadResolvedSchedule = useCallback(async () => {
    if (!student?.id) return;
    setIsScheduleLoading(true);
    setScheduleError('');
    try {
      const response = await authFetch(`/api/scheduler/${encodeURIComponent(student.id)}/enrolled`, {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Unable to load the saved class schedule.');
      }
      setResolvedSchedule(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      console.error('Failed to resolve Registrar schedule:', error);
      setResolvedSchedule([]);
      setScheduleError(error.message || 'Unable to load the saved class schedule.');
    } finally {
      setIsScheduleLoading(false);
    }
  }, [student?.id]);

  useEffect(() => {
    loadResolvedSchedule();
  }, [loadResolvedSchedule, selectedSubjectsKey]);

  const scheduleRows = resolvedSchedule.length > 0 ? resolvedSchedule : selectedSubjectDetails;

  if (!student) return null;

  function showFlash(message, type = 'success') {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  }

  async function handleValidateEnrollment() {
    const isConfirmed = await confirm({
      title: 'Finalize Official Enrollment',
      message: `Are you sure you want to officially enroll ${student.firstName} ${student.lastName} for the current term? This action will generate their class schedule, registration form, and official receipt.`,
      confirmText: 'Officially Enroll',
      cancelText: 'Cancel',
      type: 'success',
    });
    
    if (!isConfirmed) return;

    await dispatch({
      type: 'VALIDATE_ENROLLMENT',
      payload: { studentId: student.id },
    });
    
    showFlash(`Enrollment validated for ${student.firstName} ${student.lastName}`);
  }

  async function handleRollover() {
    const isConfirmed = await confirm({
      title: 'Initialize Next Semester',
      message: `Are you sure you want to rollover ${student.firstName} ${student.lastName} to the next academic term? This will archive their current subjects and reset their enrollment status.`,
      confirmText: 'Yes, Rollover',
      cancelText: 'Cancel',
      type: 'warning',
    });
    
    if (!isConfirmed) return;

    await dispatch({
      type: 'ROLLOVER_STUDENT',
      payload: { studentId: student.id },
    });
    
    showFlash(`Successfully rolled over ${student.firstName} ${student.lastName} to Continuing Student`);
  }

  function getDocLabel(typeId) {
    const doc = REQUIRED_DOCUMENTS.find((d) => d.id === typeId);
    return doc ? doc.label : typeId;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-6 bg-white border-b border-slate-200/80 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 hover:text-univ-navy hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-extrabold text-univ-navy">
              {student.firstName} {student.lastName}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="font-mono text-slate-400">{student.studentId || student.id}</span>
              <span>&bull;</span>
              <span>{program?.name || 'No program selected'}</span>
              <span>&bull;</span>
              <span className="text-univ-gold">{student.enrollmentType}</span>
            </div>
          </div>
        </div>
        <PortalRefreshButton
          onRefresh={() => Promise.all([refreshStudents(), loadResolvedSchedule()])}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Flash message */}
        {flashMessage && (
          <div
            className={`mx-8 mt-6 px-4 py-3 rounded-xl text-xs font-bold shadow-sm ${
              flashMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40'
                : 'bg-rose-50 text-rose-700 border border-rose-200/40'
            }`}
          >
            {flashMessage.message}
          </div>
        )}

        <div className="p-8 space-y-6">
          {/* Status Banner */}
          {student.status === 'enrolled' ? (
            <div className="flex items-center gap-3.5 p-5 bg-emerald-50 border border-emerald-200/40 rounded-2xl shadow-sm">
              <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 stroke-[2]" />
              <div className="flex-1">
                <p className="text-xs font-bold text-emerald-800">Enrollment Validated &amp; Finalized</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">
                  Verified on {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button 
                onClick={handleRollover}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Initialize Next Semester
              </button>
              <StatusBadge status="enrolled" />
            </div>
          ) : (
            <div className="flex items-center justify-between p-5 bg-white border border-univ-blue/30 rounded-2xl shadow-premium">
              <div className="flex items-center gap-3.5">
                <ShieldCheck className="h-5 w-5 text-univ-blue flex-shrink-0 stroke-[2]" />
                <div>
                  <p className="text-xs font-bold text-univ-navy">Pending Final Registrar Validation</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    Review documents, subjects, and financial clearance before finalizing enrollment.
                  </p>
                </div>
              </div>
              <button
                onClick={handleValidateEnrollment}
                className="rounded-lg bg-univ-blue px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 cursor-pointer"
              >
                Validate enrollment
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Docs & Payment */}
            <div className="space-y-6 lg:col-span-1">
              {/* Generated Documents (enrolled only) */}
              {student.status === 'enrolled' && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
                  <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Generated Records</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Class Schedule', icon: Calendar, generated: student.scheduleGenerated },
                      { label: 'Registration Form', icon: FileText, generated: student.registrationFormGenerated },
                      { label: 'Official Receipt', icon: Receipt, generated: student.receiptGenerated },
                    ].map((doc) => (
                      <div
                        key={doc.label}
                        className="flex items-center justify-between px-4 py-3 bg-slate-50/40 border border-slate-150 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          {doc.generated ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500 stroke-[2.5]" />
                          ) : (
                            <doc.icon className="h-4 w-4 text-slate-400" />
                          )}
                          <span className="text-xs font-bold text-slate-700">{doc.label}</span>
                        </div>
                        {doc.generated && (
                          <button className="text-univ-blue hover:bg-blue-50 p-1.5 rounded-lg transition-colors cursor-pointer">
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Clearance */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
                <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Financial Clearance</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</p>
                    <div className="mt-1.5">
                      <StatusBadge status={
                        ['paid', 'partial'].includes(student.paymentStatus)
                          ? student.paymentStatus
                          : 'payment_pending'
                      } />
                    </div>
                  </div>
                  {['paid', 'partial'].includes(student.paymentStatus) && (
                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                      <p className="text-xs font-semibold text-emerald-800">
                        {student.paymentStatus === 'paid'
                          ? `Fully settled via ${student.paymentMethod || 'standard method'}.`
                          : `Downpayment confirmed via ${student.paymentMethod || 'standard method'}.`}
                      </p>
                      <p className="text-[11px] font-medium text-emerald-700">
                        Received: {formatPeso(student.amountPaid || 0)}
                        {student.remainingBalance > 0 && ` · Remaining balance: ${formatPeso(student.remainingBalance)}`}
                      </p>
                      {student.paymentReference && (
                        <p className="text-[10px] text-emerald-700">Reference: {student.paymentReference}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Documents Checklist */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
                <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Admissions Documents</h3>
                <div className="space-y-2.5">
                  {student.documents.map((doc) => (
                    <div
                      key={doc.typeId}
                      className="flex items-center gap-3 px-4 py-3 bg-slate-50/40 border border-slate-150 rounded-xl"
                    >
                      {doc.status === 'approved' ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 stroke-[2.5]" />
                      ) : (
                        <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{getDocLabel(doc.typeId)}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{doc.fileName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Subjects & Assessment */}
            <div className="space-y-6 lg:col-span-2">
              {/* Selected Subjects */}
              {(scheduleRows.length > 0 || student.selectedSubjects?.length > 0) && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
                  <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Final Schedule Selection</h3>
                  {isScheduleLoading && (
                    <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700">
                      Loading saved section schedules...
                    </div>
                  )}
                  {scheduleError && (
                    <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                      {scheduleError}
                    </div>
                  )}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                          <th className="px-4 py-3.5">Code</th>
                          <th className="px-4 py-3.5">Subject Description</th>
                          <th className="px-4 py-3.5">Units</th>
                          <th className="px-4 py-3.5">Schedule</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {scheduleRows.map((subject) => (
                          <tr key={`${subject.subjectId || subject.id}-${subject.sectionId || ''}`} className="hover:bg-slate-50/30">
                            <td className="px-4 py-3.5 font-mono text-xs font-bold text-univ-navy">
                              <span className="block">{subject.subjectCode || subject.code}</span>
                              {subject.sectionCode && (
                                <span className="mt-0.5 block text-[10px] text-slate-400">{subject.sectionCode}</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-slate-700 font-semibold">{subject.subjectName || subject.name}</td>
                            <td className="px-4 py-3.5 text-slate-500 font-bold">{subject.units}</td>
                            <td className="px-4 py-3.5 text-slate-500 font-medium">
                              <span className="block">{subject.schedule.day} &bull; {subject.schedule.time}</span>
                              {(subject.schedule.room || subject.instructor) && (
                                <span className="mt-0.5 block text-[10px] text-slate-400">
                                  Room {subject.schedule.room || 'TBA'} &bull; {subject.instructor || 'TBA'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Assessment Summary */}
              {student.tuitionBreakdown && student.tuitionBreakdown.length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
                  <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Official Assessment Summary</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-w-lg">
                    <table className="w-full text-left text-xs">
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {student.tuitionBreakdown.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2.5 text-slate-600 font-semibold">{item.label}</td>
                            <td className="px-4 py-2.5 text-right text-univ-navy font-bold">
                              {formatPeso(item.amount)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50/80 font-bold">
                          <td className="px-4 py-3 text-univ-navy font-extrabold uppercase tracking-widest text-[10px]">Total Tuition Due</td>
                          <td className="px-4 py-3 text-right text-univ-navy font-extrabold text-sm">
                            {formatPeso(student.totalTuition)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
