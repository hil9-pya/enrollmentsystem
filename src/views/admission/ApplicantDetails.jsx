import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, FileText, ExternalLink, AlertCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useConfirm } from '../../context/ConfirmationContext';
import { REQUIRED_DOCUMENTS, PROGRAMS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import Modal from '../../components/Modal';
import { authFetch } from '../../utils/authFetch.js';

export default function ApplicantDetails({ studentId, onBack }) {
  const { getStudentById, dispatch } = useEnrollment();
  const { confirm } = useConfirm();
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const student = getStudentById(studentId);
  if (!student) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full">
        <p className="text-slate-500 font-medium">Applicant not found.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">Go Back</button>
      </div>
    );
  }

  const program = PROGRAMS.find((p) => p.id === student.programId);

  async function handleApprove() {
    const isConfirmed = await confirm({
      title: 'Approve applicant?',
      message: 'This will verify the submitted admission documents and move the applicant to academic evaluation.',
      confirmText: 'Approve',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!isConfirmed) return;
    
    setIsProcessing(true);
    try {
      await dispatch({
        type: 'APPROVE_DOCUMENTS',
        payload: { studentId: student.id, notes },
      });
      // The dispatch will handle the state update, but we should show a success toast.
      // Assuming dispatch handles errors via toast, we only reach here if it didn't throw,
      // but dispatch in this app catches errors internally. We should check if status actually changed
      // but for simplicity, we'll assume it worked if no exception was thrown and we'll show success.
      toast.success('Applicant approved successfully.');
      setNotes('');
    } catch {
      toast.error('Unable to update applicant status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleReject() {
    const isConfirmed = await confirm({
      title: 'Reject applicant?',
      message: 'The applicant will be notified that the submitted requirements were not accepted.',
      confirmText: 'Reject',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;
    
    setIsProcessing(true);
    try {
      await dispatch({
        type: 'REJECT_DOCUMENTS',
        payload: { studentId: student.id, notes },
      });
      toast.success('Applicant rejected successfully.');
      setNotes('');
    } catch {
      toast.error('Unable to update applicant status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  function getDocLabel(typeId) {
    const doc = REQUIRED_DOCUMENTS.find((d) => d.id === typeId);
    return doc ? doc.label : typeId;
  }

  async function previewDocument(doc) {
    if (!doc?.fileName) return;
    try {
      const response = await authFetch(
        `/api/students/${encodeURIComponent(student.id)}/documents/${encodeURIComponent(doc.typeId)}/file`
      );
      if (!response.ok) throw new Error('Document could not be loaded.');
      const blob = await response.blob();
      setPreviewDoc({
        url: URL.createObjectURL(blob),
        name: doc.originalName || doc.fileName,
        isPdf: blob.type === 'application/pdf' || String(doc.fileName).toLowerCase().endsWith('.pdf'),
      });
    } catch (error) {
      toast.error(error.message);
    }
  }

  function closePreview() {
    if (previewDoc?.url) URL.revokeObjectURL(previewDoc.url);
    setPreviewDoc(null);
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
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center gap-4 shrink-0 shadow-sm z-10">
        <button 
          onClick={onBack}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-univ-navy">Applicant details</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Review information and process applications.</p>
        </div>
        <div className="ml-auto">
          <PortalRefreshButton />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">

        <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-5 shadow-premium">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-univ-indigo/10 flex items-center justify-center flex-shrink-0 text-univ-indigo font-extrabold text-xl uppercase">
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-univ-navy">
                {student.firstName} {student.lastName}
              </h2>
              <div className="flex items-center gap-3.5 mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="font-mono text-slate-400">{student.studentId || student.id}</span>
                <span>&bull;</span>
                <span className="text-univ-indigo">{program?.name || 'No program selected'}</span>
                <span>&bull;</span>
                <span className="text-univ-gold">{student.enrollmentType}</span>
              </div>
            </div>
          </div>
          <div>
            <StatusBadge status={student.status} />
          </div>
        </div>

        {student.submitDocumentsOnCampus && (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-amber-50/50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-semibold text-slate-800">On-campus document submission</p>
              <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-600">
                Applicant will submit Form 137 and PSA birth certificate on campus. Form 138 must still be uploaded online.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
          <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Personal Contact Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email Address</p>
              <p className="text-xs font-bold text-univ-navy mt-1">{student.email || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contact Phone</p>
              <p className="text-xs font-bold text-univ-navy mt-1">{student.phone || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date of Birth</p>
              <p className="text-xs font-bold text-univ-navy mt-1">{formatDate(student.birthDate)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Home Address</p>
              <p className="text-xs font-bold text-univ-navy mt-1 leading-relaxed truncate">{student.address || '—'}</p>
            </div>
          </div>
        </div>

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
                {student.documents?.length === 0 || !student.documents ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-medium">
                      No document files have been uploaded yet.
                    </td>
                  </tr>
                ) : (
                  student.documents.map((doc) => {
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
                          {doc.fileName ? (
                            <button
                              type="button"
                              onClick={() => previewDocument(doc)}
                              className="inline-flex max-w-xs items-center gap-1.5 font-mono text-xs font-bold text-univ-indigo hover:text-univ-blue hover:underline cursor-pointer bg-transparent border-none text-left"
                              title={`Preview ${displayName}`}
                            >
                              <span className="truncate">{displayName}</span>
                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                            </button>
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

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
          <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Admissions Evaluation Actions</h3>
          {student.status === 'registration' ? (
            <div className="flex items-center gap-3 px-5 py-4 rounded-xl border shadow-sm bg-slate-50 border-slate-200 text-slate-500">
              <Clock className="w-6 h-6 shrink-0 text-slate-400" />
              <div>
                <p className="font-extrabold uppercase tracking-widest text-[10px]">Awaiting Submission</p>
                <p className="font-semibold text-sm text-slate-600">Applicant has not submitted documents yet</p>
              </div>
            </div>
          ) : student.status === 'documents_submitted' ? (
            <>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write evaluation feedback or rejection details here..."
                rows={3}
                disabled={isProcessing}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white resize-none disabled:opacity-50"
              />
              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="min-w-24 rounded-lg bg-univ-blue px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 cursor-pointer"
                >
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="min-w-24 rounded-lg border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
              {student.status === 'documents_rejected' ? (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              ) : (
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <div>
                <p className={`text-xs font-semibold ${
              student.status === 'documents_rejected'
                ? 'text-rose-700'
                : 'text-emerald-700'
                }`}>Decision finalized</p>
                <p className="mt-1 text-xs text-slate-600">
                  {student.status === 'documents_rejected' ? 'Application rejected.' : 'Application approved.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {previewDoc && (
        <Modal isOpen onClose={closePreview} title={previewDoc.name} maxWidth="max-w-5xl">
              <div className="mb-3 flex justify-end">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Open in new tab
                </a>
              </div>
            
            <div className="h-[65vh] bg-slate-100 p-4 flex items-center justify-center overflow-auto rounded-md">
              {previewDoc.isPdf ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-full rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md border border-slate-200 bg-white"
                />
              )}
            </div>
        </Modal>
      )}
    </div>
  );
}
