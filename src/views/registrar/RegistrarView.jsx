import { useState, useMemo } from 'react';
import { ShieldCheck, CheckCircle, FileText, Calendar, Receipt, ChevronDown, ChevronRight } from 'lucide-react';
import { useEnrollment } from '../../context/EnrollmentContext';
import StatusBadge from '../../components/StatusBadge';
import SearchInput from '../../components/SearchInput';
import { SUBJECTS, PROGRAMS, REQUIRED_DOCUMENTS } from '../../data/mockData';

function formatPeso(amount) {
  if (amount == null) return '₱0';
  return '₱' + amount.toLocaleString('en-PH');
}

export default function RegistrarView() {
  const { state, dispatch, getStudentsByStatus, getStudentById } = useEnrollment();

  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [flashMessage, setFlashMessage] = useState(null);
  const [enrolledCollapsed, setEnrolledCollapsed] = useState(false);
  const [confirmingValidation, setConfirmingValidation] = useState(false);

  const pendingStudents = useMemo(() => {
    return [
      ...getStudentsByStatus('validation_pending'),
      ...getStudentsByStatus('payment_confirmed'),
    ];
  }, [state.students, getStudentsByStatus]);
  const enrolledStudents = getStudentsByStatus('enrolled');

  const filteredPending = useMemo(() => {
    if (!searchQuery.trim()) return pendingStudents;
    const q = searchQuery.toLowerCase();
    return pendingStudents.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [pendingStudents, searchQuery]);

  const filteredEnrolled = useMemo(() => {
    if (!searchQuery.trim()) return enrolledStudents;
    const q = searchQuery.toLowerCase();
    return enrolledStudents.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [enrolledStudents, searchQuery]);

  const selectedStudent = selectedStudentId ? getStudentById(selectedStudentId) : null;
  const program = selectedStudent
    ? PROGRAMS.find((p) => p.id === selectedStudent.programId)
    : null;

  const selectedSubjectDetails = useMemo(() => {
    if (!selectedStudent) return [];
    return selectedStudent.selectedSubjects
      .map((ss) => SUBJECTS.find((s) => s.id === ss.subjectId))
      .filter(Boolean);
  }, [selectedStudent]);

  function handleSelectStudent(studentId) {
    setSelectedStudentId(studentId);
    setFlashMessage(null);
    setConfirmingValidation(false);
    dispatch({ type: 'SET_CURRENT_STUDENT', payload: { studentId } });
  }

  function showFlash(message, type) {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  }

  async function handleValidateEnrollment() {
    if (!selectedStudent) return;
    if (!confirmingValidation) {
      setConfirmingValidation(true);
      return;
    }
    await dispatch({
      type: 'VALIDATE_ENROLLMENT',
      payload: { studentId: selectedStudent.id },
    });
    showFlash(
      `Enrollment validated for ${selectedStudent.firstName} ${selectedStudent.lastName}`,
      'success'
    );
    setSelectedStudentId(null);
    setConfirmingValidation(false);
  }

  function getDocLabel(typeId) {
    const doc = REQUIRED_DOCUMENTS.find((d) => d.id === typeId);
    return doc ? doc.label : typeId;
  }  function StudentCard({ student }) {
    const isActive = selectedStudentId === student.id;
    return (
      <button
        onClick={() => handleSelectStudent(student.id)}
        className={`w-full text-left p-4.5 transition-colors cursor-pointer flex flex-col gap-2 ${
          isActive
            ? 'bg-slate-50 border-l-4 border-l-univ-indigo'
            : 'hover:bg-slate-50/50 border-l-4 border-l-transparent'
        }`}
      >
        <div className="min-w-0 w-full">
          <p className="text-xs font-bold text-univ-navy truncate">
            {student.firstName} {student.lastName}
          </p>
          <p className="text-[10px] font-mono text-slate-400 font-bold mt-0.5">{student.id}</p>
        </div>
        <div className="flex items-center justify-between w-full mt-1.5">
          <StatusBadge status={student.status} />
          <span className="text-[10px] font-bold text-slate-500 capitalize">{student.enrollmentType}</span>
        </div>
      </button>
    );
  }

  return (
    <div className="flex h-full bg-slate-50">
      {/* Left Panel */}
      <div className="w-96 flex-shrink-0 border-r border-slate-200 flex flex-col bg-white shadow-sm">
        <div className="p-5 pb-3.5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-univ-navy uppercase tracking-wider">Office of Registrar</h2>
            <button
              onClick={() => {
                const csvData = [
                  ['Student ID', 'First Name', 'Last Name', 'Email', 'Program', 'Status'],
                  ...enrolledStudents.map(s => [s.id, s.firstName, s.lastName, s.email, s.programId, s.status])
                ].map(e => e.join(",")).join("\n");
                const blob = new Blob([csvData], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `enrolled_students_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
              }}
              className="px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name or ID..."
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border-t border-slate-100">
          {/* Pending Validation Section */}
          <div>
            <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  Pending Validation
                </h3>
                <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full">
                  {filteredPending.length}
                </span>
              </div>
            </div>
            {filteredPending.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400">
                <p className="text-xs font-semibold text-slate-500">No applicants pending validation</p>
              </div>
            ) : (
              filteredPending.map((student) => (
                <StudentCard key={student.id} student={student} />
              ))
            )}
          </div>

          {/* Enrolled Students Section (collapsible) */}
          <div>
            <button
              onClick={() => setEnrolledCollapsed(!enrolledCollapsed)}
              className="w-full px-5 py-3.5 bg-slate-50/70 border-b border-slate-200/50 flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  Enrolled Students
                </h3>
                <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                  {filteredEnrolled.length}
                </span>
              </div>
              {enrolledCollapsed ? (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {!enrolledCollapsed && (
              <div className="divide-y divide-slate-100">
                {filteredEnrolled.length === 0 ? (
                  <div className="px-6 py-8 text-center text-slate-400">
                    <p className="text-xs font-semibold text-slate-500">No enrolled students found</p>
                  </div>
                ) : (
                  filteredEnrolled.map((student) => (
                    <StudentCard key={student.id} student={student} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
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

        {!selectedStudent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <ShieldCheck className="h-10 w-10 mb-2.5 opacity-55 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select a student record to review</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* Enrolled Banner */}
            {selectedStudent.status === 'enrolled' && (
              <div className="flex items-center gap-3.5 p-5 bg-emerald-50 border border-emerald-200/40 rounded-2xl shadow-sm">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 stroke-[2]" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">Enrollment Validated &amp; Finalized</p>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">
                    Verified on {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            )}

            {/* Student Header */}
            <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-premium">
              <div className="h-12 w-12 rounded-xl bg-univ-blue/10 flex items-center justify-center flex-shrink-0 text-univ-blue font-extrabold text-lg">
                {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-univ-navy">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                <div className="flex items-center gap-3.5 mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="font-mono text-slate-400">{selectedStudent.id}</span>
                  <span>&bull;</span>
                  <span>{program?.name || 'No program selected'}</span>
                  <span>&bull;</span>
                  <span>{selectedStudent.academicTerm || '—'}</span>
                  <span>&bull;</span>
                  <span className="text-univ-gold">{selectedStudent.enrollmentType}</span>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
              <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Admissions Checklist Verification</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {selectedStudent.documents.map((doc) => (
                  <div
                    key={doc.typeId}
                    className="flex items-center gap-3 px-4 py-3 bg-slate-50/40 border border-slate-150 rounded-xl"
                  >
                    {doc.status === 'approved' ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 stroke-[2.5]" />
                    ) : (
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-xs font-bold text-slate-700 flex-1">{getDocLabel(doc.typeId)}</span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold truncate max-w-[120px]">{doc.fileName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Subjects */}
            {selectedSubjectDetails.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
                <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Final Selected Schedule Subjects</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                        <th className="px-4 py-3.5">Code</th>
                        <th className="px-4 py-3.5">Subject Description</th>
                        <th className="px-4 py-3.5">Units</th>
                        <th className="px-4 py-3.5">Lecture Details</th>
                        <th className="px-4 py-3.5">Instructor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedSubjectDetails.map((subject) => (
                        <tr key={subject.id} className="hover:bg-slate-50/30">
                          <td className="px-4 py-3.5 font-mono text-xs font-bold text-univ-navy">{subject.code}</td>
                          <td className="px-4 py-3.5 text-slate-700 font-semibold">{subject.name}</td>
                          <td className="px-4 py-3.5 text-slate-500 font-bold">{subject.units}</td>
                          <td className="px-4 py-3.5 text-slate-500 font-medium">
                            {subject.schedule.day} &bull; {subject.schedule.time} ({subject.schedule.room})
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 font-semibold">{subject.instructor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tuition Summary */}
            {selectedStudent.tuitionBreakdown && selectedStudent.tuitionBreakdown.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
                <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Official Assessment Summary</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-w-lg">
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {selectedStudent.tuitionBreakdown.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2.5 text-slate-600 font-semibold">{item.label}</td>
                          <td className="px-4 py-2.5 text-right text-univ-navy font-bold">
                            {formatPeso(item.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/80 font-bold">
                        <td className="px-4 py-3 text-univ-navy font-extrabold">Total Tuition Due</td>
                        <td className="px-4 py-3 text-right text-univ-navy font-extrabold">
                          {formatPeso(selectedStudent.totalTuition)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
              <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Financial Payment Settlement</h3>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Settlement Mode</p>
                  <p className="text-xs font-bold text-univ-navy mt-1.5 capitalize">{selectedStudent.paymentMethod || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Clearance Status</p>
                  <div className="mt-1">
                    <StatusBadge status={
                      selectedStudent.paymentStatus === 'paid'
                        ? 'payment_confirmed'
                        : selectedStudent.paymentStatus === 'unpaid'
                        ? 'payment_pending'
                        : 'payment_pending'
                    } />
                  </div>
                </div>
              </div>
            </div>

            {/* Generated Documents (enrolled only) */}
            {selectedStudent.status === 'enrolled' && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
                <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Generated Fulfillment Records</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Class Schedule', icon: Calendar, generated: selectedStudent.scheduleGenerated },
                    { label: 'Registration Form', icon: FileText, generated: selectedStudent.registrationFormGenerated },
                    { label: 'Official Receipt', icon: Receipt, generated: selectedStudent.receiptGenerated },
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
                        <span className="inline-flex items-center px-3 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-full uppercase tracking-wider">
                          Ready
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validate Action */}
            {(selectedStudent.status === 'validation_pending' || selectedStudent.status === 'payment_confirmed') && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium pt-6">
                {confirmingValidation && (
                  <div className="mb-4.5 px-4.5 py-3.5 bg-amber-50 border border-univ-gold/20 rounded-xl">
                    <p className="text-xs text-univ-gold font-bold leading-relaxed">
                      Confirm Final Enrollment Validation for applicant{' '}
                      <span className="underline">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </span>
                      ? This action generates their official Certificate of Registration and class schedules.
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleValidateEnrollment}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-univ-indigo hover:bg-univ-blue rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {confirmingValidation ? 'Confirm & Finalize' : 'Validate & Finalize Enrollment'}
                  </button>
                  {confirmingValidation && (
                    <button
                      onClick={() => setConfirmingValidation(false)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-350 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
