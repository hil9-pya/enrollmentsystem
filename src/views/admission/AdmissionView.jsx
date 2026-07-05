import { useState, useMemo } from 'react';
import { ClipboardList, FileText, CheckCircle, XCircle, User, ExternalLink } from 'lucide-react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useConfirm } from '../../context/ConfirmationContext';
import StatusBadge from '../../components/StatusBadge';
import SearchInput from '../../components/SearchInput';
import { REQUIRED_DOCUMENTS, PROGRAMS } from '../../data/mockData';

export default function AdmissionView() {
  const { dispatch, getStudentsByStatus, getStudentById } = useEnrollment();
  const { confirm } = useConfirm();

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

  async function handleApprove() {
    if (!selectedStudent) return;
    const isConfirmed = await confirm({
      title: 'Approve Admission',
      message: `Are you sure you want to approve the documents for ${selectedStudent.firstName} ${selectedStudent.lastName}? This clears their admissions hold.`,
      confirmText: 'Approve Documents',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!isConfirmed) return;
    await dispatch({
      type: 'APPROVE_DOCUMENTS',
      payload: { studentId: selectedStudent.id, notes },
    });
    showFlash(`Documents approved for ${selectedStudent.firstName} ${selectedStudent.lastName}`, 'success');
    setSelectedStudentId(null);
    setNotes('');
  }

  async function handleReject() {
    if (!selectedStudent) return;
    const isConfirmed = await confirm({
      title: 'Request Resubmission',
      message: `Are you sure you want to request document resubmission for ${selectedStudent.firstName} ${selectedStudent.lastName}? This notifies the applicant to upload correct files.`,
      confirmText: 'Request Resubmission',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;
    await dispatch({
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
  };  return (
    <div className="flex h-full bg-slate-50">
      {/* Left Panel: Queue */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col bg-white shadow-sm">
        <div className="p-5 pb-3.5 space-y-3.5">
          <h2 className="text-xs font-bold text-univ-navy uppercase tracking-wider">Document Review Queue</h2>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by name or ID..."
          />
        </div>
 
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6">
              <ClipboardList className="h-9 w-9 mb-2.5 opacity-55 text-slate-400" />
              <p className="text-xs text-center font-bold text-slate-500">No applications pending review</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => handleSelectStudent(student.id)}
                className={`w-full text-left p-4.5 transition-colors cursor-pointer flex flex-col gap-2 ${
                  selectedStudentId === student.id
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
            ))
          )}
        </div>
      </div>
 
      {/* Right Panel: Detail */}
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
            <ClipboardList className="h-10 w-10 mb-2.5 opacity-55 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select an applicant to review</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
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
                  <span className="text-univ-gold">{selectedStudent.enrollmentType}</span>
                </div>
              </div>
            </div>
 
            {/* Personal Information */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
              <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Personal Contact Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</p>
                  <p className="text-xs font-bold text-univ-navy mt-1">{selectedStudent.email || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contact Phone</p>
                  <p className="text-xs font-bold text-univ-navy mt-1">{selectedStudent.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date of Birth</p>
                  <p className="text-xs font-bold text-univ-navy mt-1">{formatDate(selectedStudent.birthDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Residential Address</p>
                  <p className="text-xs font-bold text-univ-navy mt-1 leading-relaxed">{selectedStudent.address || '—'}</p>
                </div>
              </div>
            </div>
 
            {/* Uploaded Documents */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
              <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Submitted Documents Checklist</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                      <th className="px-4 py-3.5">Document Type</th>
                      <th className="px-4 py-3.5">Filename Link</th>
                      <th className="px-4 py-3.5">Date Uploaded</th>
                      <th className="px-4 py-3.5">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedStudent.documents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-medium">
                          No document files have been uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      selectedStudent.documents.map((doc) => {
                        const documentUrl = getDocumentUrl(doc);
                        const displayName = doc.originalName || doc.fileName;
 
                        return (
                          <tr key={doc.typeId} className="hover:bg-slate-50/30">
                            <td className="px-4 py-3.5 text-slate-700 font-semibold">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                {getDocLabel(doc.typeId)}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {documentUrl ? (
                                <a
                                  href={documentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex max-w-xs items-center gap-1.5 font-mono text-xs font-bold text-univ-indigo hover:text-univ-blue hover:underline"
                                  title={`Open ${displayName}`}
                                >
                                  <span className="truncate">{displayName}</span>
                                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                                </a>
                              ) : (
                                <span className="font-mono text-xs text-slate-400">No file available</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 font-medium">{formatDateTime(doc.uploadedAt)}</td>
                            <td className="px-4 py-3.5">{docStatusIcon(doc.status)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
 
            {/* Review Actions */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
              <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Admissions Evaluation Actions</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write evaluation feedback or rejection details here..."
                rows={3}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white resize-none"
              />
              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Application
                </button>
                <button
                  onClick={handleReject}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-sm cursor-pointer"
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
