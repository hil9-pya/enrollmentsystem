import { useState, useMemo } from 'react';
import { ClipboardList, FileText, CheckCircle, XCircle, User, ExternalLink } from 'lucide-react';
import { useEnrollment } from '../../context/EnrollmentContext';
import StatusBadge from '../../components/StatusBadge';
import SearchInput from '../../components/SearchInput';
import { REQUIRED_DOCUMENTS, PROGRAMS } from '../../data/mockData';

export default function AdmissionView() {
  const { dispatch, getStudentsByStatus, getStudentById } = useEnrollment();

  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [flashMessage, setFlashMessage] = useState(null);

  const queueStudents = getStudentsByStatus('documents_submitted');

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return queueStudents;
    const q = searchQuery.toLowerCase();
    return queueStudents.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [queueStudents, searchQuery]);

  const selectedStudent = selectedStudentId ? getStudentById(selectedStudentId) : null;
  const program = selectedStudent
    ? PROGRAMS.find((p) => p.id === selectedStudent.programId)
    : null;

  function handleSelectStudent(studentId) {
    setSelectedStudentId(studentId);
    setNotes('');
    setFlashMessage(null);
    dispatch({ type: 'SET_CURRENT_STUDENT', payload: { studentId } });
  }

  function showFlash(message, type) {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  }

  function handleApprove() {
    if (!selectedStudent) return;
    dispatch({
      type: 'APPROVE_DOCUMENTS',
      payload: { studentId: selectedStudent.id, notes },
    });
    showFlash(`Documents approved for ${selectedStudent.firstName} ${selectedStudent.lastName}`, 'success');
    setSelectedStudentId(null);
    setNotes('');
  }

  function handleReject() {
    if (!selectedStudent) return;
    dispatch({
      type: 'REJECT_DOCUMENTS',
      payload: { studentId: selectedStudent.id, notes },
    });
    showFlash(`Resubmission requested for ${selectedStudent.firstName} ${selectedStudent.lastName}`, 'error');
    setSelectedStudentId(null);
    setNotes('');
  }

  function getDocLabel(typeId) {
    const doc = REQUIRED_DOCUMENTS.find((d) => d.id === typeId);
    return doc ? doc.label : typeId;
  }

  function getDocumentUrl(doc) {
    if (!doc?.fileName) return null;
    return `/uploads/${encodeURIComponent(doc.fileName)}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const docStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 text-rose-600"><span className="h-2 w-2 rounded-full bg-rose-500" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-amber-600"><span className="h-2 w-2 rounded-full bg-amber-500" /> Pending</span>;
    }
  };

  return (
    <div className="flex h-full">
      {/* ── Left Panel: Queue ─────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col">
        <div className="p-6 pb-4 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Document Review Queue</h2>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name or ID..."
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 px-6">
              <ClipboardList className="h-10 w-10 mb-3" />
              <p className="text-sm text-center">No documents pending review</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => handleSelectStudent(student.id)}
                className={`w-full text-left p-4 border-b border-slate-100 transition-colors duration-150 cursor-pointer ${
                  selectedStudentId === student.id
                    ? 'bg-slate-50 border-l-2 border-l-indigo-600'
                    : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{student.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={student.status} />
                  <span className="text-xs text-slate-500 capitalize">{student.enrollmentType}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right Panel: Detail ───────────────────────────────────────────── */}
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
            <ClipboardList className="h-12 w-12 mb-4" />
            <p className="text-sm">Select a student to review their documents</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* ── Student Header ──────────────────────────────────────── */}
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm font-mono text-slate-500">{selectedStudent.id}</span>
                  <span className="text-sm text-slate-500">{program?.name || '—'}</span>
                  <span className="text-sm text-slate-500 capitalize">{selectedStudent.enrollmentType}</span>
                </div>
              </div>
            </div>

            {/* ── Personal Information ────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Email</p>
                  <p className="text-sm text-slate-700">{selectedStudent.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Phone</p>
                  <p className="text-sm text-slate-700">{selectedStudent.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Birth Date</p>
                  <p className="text-sm text-slate-700">{formatDate(selectedStudent.birthDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Address</p>
                  <p className="text-sm text-slate-700">{selectedStudent.address || '—'}</p>
                </div>
              </div>
            </div>

            {/* ── Uploaded Documents ──────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Uploaded Documents</h3>
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Document Type</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">File Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Upload Date</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudent.documents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                          No documents uploaded
                        </td>
                      </tr>
                    ) : (
                      selectedStudent.documents.map((doc) => {
                        const documentUrl = getDocumentUrl(doc);
                        const displayName = doc.originalName || doc.fileName;

                        return (
                          <tr key={doc.typeId} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-4 py-3 text-slate-700">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                {getDocLabel(doc.typeId)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {documentUrl ? (
                                <a
                                  href={documentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex max-w-xs items-center gap-1.5 font-mono text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                                  title={`Open ${displayName}`}
                                >
                                  <span className="truncate">{displayName}</span>
                                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                                </a>
                              ) : (
                                <span className="font-mono text-xs text-slate-400">No file available</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(doc.uploadedAt)}</td>
                            <td className="px-4 py-3 text-xs">{docStatusIcon(doc.status)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Review Actions ──────────────────────────────────────── */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Review Actions</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes for this student..."
                rows={3}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors duration-150 resize-none"
              />
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors duration-150"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Documents
                </button>
                <button
                  onClick={handleReject}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 transition-colors duration-150"
                >
                  <XCircle className="h-4 w-4" />
                  Request Resubmission
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
