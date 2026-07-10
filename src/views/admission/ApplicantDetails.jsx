import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, FileText, ExternalLink, AlertCircle, X } from 'lucide-react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useConfirm } from '../../context/ConfirmationContext';
import { REQUIRED_DOCUMENTS, PROGRAMS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';

export default function ApplicantDetails({ studentId, onBack }) {
  const { getStudentById, dispatch } = useEnrollment();
  const { confirm } = useConfirm();
  const [notes, setNotes] = useState('');
  const [flashMessage, setFlashMessage] = useState(null);
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

  function showFlash(message, type) {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  }

  async function handleApprove() {
    const isConfirmed = await confirm({
      title: 'Approve Admission',
      message: `Are you sure you want to approve the documents for ${student.firstName} ${student.lastName}? This clears their admissions hold.`,
      confirmText: 'Approve Documents',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!isConfirmed) return;
    await dispatch({
      type: 'APPROVE_DOCUMENTS',
      payload: { studentId: student.id, notes },
    });
    showFlash(`Documents approved for ${student.firstName} ${student.lastName}`, 'success');
    setNotes('');
  }

  async function handleReject() {
    const isConfirmed = await confirm({
      title: 'Request Resubmission',
      message: `Are you sure you want to request document resubmission for ${student.firstName} ${student.lastName}? This notifies the applicant to upload correct files.`,
      confirmText: 'Request Resubmission',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;
    await dispatch({
      type: 'REJECT_DOCUMENTS',
      payload: { studentId: student.id, notes },
    });
    showFlash(`Resubmission requested for ${student.firstName} ${student.lastName}`, 'error');
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
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center gap-4 shrink-0 shadow-sm z-10">
        <button 
          onClick={onBack}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-univ-navy">Applicant Details</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Review information and process applications.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {flashMessage && (
          <div
            className={`px-4 py-3 rounded-xl text-xs font-bold shadow-sm ${
              flashMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40'
                : 'bg-rose-50 text-rose-700 border border-rose-200/40'
            }`}
          >
            {flashMessage.message}
          </div>
        )}

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
                <span className="font-mono text-slate-400">{student.id}</span>
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
          <div className="bg-amber-50 border border-amber-250/50 text-amber-800 text-xs font-medium px-4.5 py-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-extrabold uppercase tracking-wide text-amber-800 text-[10px] block mb-0.5">On-Campus Submission Selected</span>
              This applicant has requested to submit their Form 137 and PSA Birth Certificate physically on-campus. Only Form 138 (Report Card) is required to be submitted online.
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
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ url: documentUrl, name: displayName })}
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
              Mark Documents Incomplete
            </button>
          </div>
        </div>
      </div>

      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-univ-navy">{previewDoc.name}</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Document Preview</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-all cursor-pointer bg-white"
                  title="Close preview"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center overflow-auto">
              {previewDoc.url.toLowerCase().split('?')[0].endsWith('.pdf') ? (
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
          </div>
        </div>
      )}
    </div>
  );
}
