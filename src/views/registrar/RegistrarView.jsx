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

  function handleValidateEnrollment() {
    if (!selectedStudent) return;
    if (!confirmingValidation) {
      setConfirmingValidation(true);
      return;
    }
    dispatch({
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
  }

  function StudentCard({ student }) {
    const isActive = selectedStudentId === student.id;
    return (
      <button
        onClick={() => handleSelectStudent(student.id)}
        className={`w-full text-left p-4 border-b border-slate-100 transition-colors duration-150 cursor-pointer ${
          isActive
            ? 'bg-slate-50 border-l-2 border-l-indigo-600'
            : 'hover:bg-slate-50 border-l-2 border-l-transparent'
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {student.firstName} {student.lastName}
          </p>
          <p className="text-xs font-mono text-slate-400 mt-0.5">{student.id}</p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <StatusBadge status={student.status} />
          <span className="text-xs text-slate-500 capitalize">{student.enrollmentType}</span>
        </div>
      </button>
    );
  }

  return (
    <div className="flex h-full">
      {/* ── Left Panel ────────────────────────────────────────────────────── */}
      <div className="w-96 flex-shrink-0 border-r border-slate-200 flex flex-col">
        <div className="p-6 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Registrar</h2>
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
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors rounded-lg flex items-center gap-1.5"
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

        <div className="flex-1 overflow-y-auto">
          {/* Pending Validation Section */}
          <div>
            <div className="px-6 py-3 bg-slate-50 border-y border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pending Validation
                </h3>
                <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  {filteredPending.length}
                </span>
              </div>
            </div>
            {filteredPending.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400">
                <p className="text-sm">No students pending validation</p>
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
              className="w-full px-6 py-3 bg-slate-50 border-y border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors duration-150"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Enrolled Students
                </h3>
                <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
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
              <>
                {filteredEnrolled.length === 0 ? (
                  <div className="px-6 py-8 text-center text-slate-400">
                    <p className="text-sm">No enrolled students</p>
                  </div>
                ) : (
                  filteredEnrolled.map((student) => (
                    <StudentCard key={student.id} student={student} />
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right Panel ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Flash message */}
        {flashMessage && (
          <div
            className={`mx-6 mt-4 px-4 py-3 rounded-md text-sm font-medium ${
              flashMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {flashMessage.message}
          </div>
        )}

        {!selectedStudent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <ShieldCheck className="h-12 w-12 mb-4" />
            <p className="text-sm">Select a student to review</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ── Enrolled Banner ─────────────────────────────────── */}
            {selectedStudent.status === 'enrolled' && (
              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-md">
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Enrollment Validated</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Validated on {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            )}

            {/* ── Student Header ──────────────────────────────────── */}
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-sm font-mono text-slate-500">{selectedStudent.id}</span>
                  <span className="text-sm text-slate-500">{program?.name || '—'}</span>
                  <span className="text-sm text-slate-500">{selectedStudent.academicTerm || '—'}</span>
                  <span className="text-sm text-slate-500 capitalize">{selectedStudent.enrollmentType}</span>
                </div>
              </div>
            </div>

            {/* ── Documents ───────────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Documents</h3>
              <div className="space-y-2">
                {selectedStudent.documents.map((doc) => (
                  <div
                    key={doc.typeId}
                    className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-md"
                  >
                    {doc.status === 'approved' ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-sm text-slate-700 flex-1">{getDocLabel(doc.typeId)}</span>
                    <span className="text-xs font-mono text-slate-400">{doc.fileName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Selected Subjects ───────────────────────────────── */}
            {selectedSubjectDetails.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Selected Subjects</h3>
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Units</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Schedule</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Instructor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSubjectDetails.map((subject) => (
                        <tr key={subject.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">{subject.code}</td>
                          <td className="px-4 py-3 text-slate-700">{subject.name}</td>
                          <td className="px-4 py-3 text-slate-500">{subject.units}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {subject.schedule.day} {subject.schedule.time} · {subject.schedule.room}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{subject.instructor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Tuition Summary ─────────────────────────────────── */}
            {selectedStudent.tuitionBreakdown && selectedStudent.tuitionBreakdown.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Tuition Summary</h3>
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {selectedStudent.tuitionBreakdown.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-2.5 text-slate-600">{item.label}</td>
                          <td className="px-4 py-2.5 text-right text-slate-700 font-medium">
                            {formatPeso(item.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">Total</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                          {formatPeso(selectedStudent.totalTuition)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Payment ─────────────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Payment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Payment Method</p>
                  <p className="text-sm text-slate-700 capitalize">{selectedStudent.paymentMethod || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Payment Status</p>
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

            {/* ── Generated Documents (enrolled only) ────────────── */}
            {selectedStudent.status === 'enrolled' && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Generated Documents</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Class Schedule', icon: Calendar, generated: selectedStudent.scheduleGenerated },
                    { label: 'Registration Form', icon: FileText, generated: selectedStudent.registrationFormGenerated },
                    { label: 'Official Receipt', icon: Receipt, generated: selectedStudent.receiptGenerated },
                  ].map((doc) => (
                    <div
                      key={doc.label}
                      className="flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        {doc.generated ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <doc.icon className="h-4 w-4 text-slate-400" />
                        )}
                        <span className="text-sm text-slate-700">{doc.label}</span>
                      </div>
                      {doc.generated && (
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm">
                          Available
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Validate Action (validation_pending or payment_confirmed) ────────── */}
            {(selectedStudent.status === 'validation_pending' || selectedStudent.status === 'payment_confirmed') && (
              <div className="pt-2">
                {confirmingValidation && (
                  <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800">
                      Are you sure you want to finalize enrollment for{' '}
                      <span className="font-semibold">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </span>
                      ? This action cannot be undone.
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleValidateEnrollment}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors duration-150"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {confirmingValidation ? 'Confirm Validation' : 'Validate & Finalize Enrollment'}
                  </button>
                  {confirmingValidation && (
                    <button
                      onClick={() => setConfirmingValidation(false)}
                      className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors duration-150"
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
