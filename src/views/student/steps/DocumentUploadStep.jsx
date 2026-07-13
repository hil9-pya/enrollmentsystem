import React, { useRef, useState, useCallback } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { useConfirm } from '../../../context/ConfirmationContext';
import { REQUIRED_DOCUMENTS } from '../../../data/mockData';
import { Upload, FileText, Check, Clock, X, AlertCircle, Loader2, Image, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName) {
  if (!fileName) return <FileText className="h-4 w-4 text-slate-400" />;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png'].includes(ext)) {
    return <Image className="h-4 w-4 text-blue-500" />;
  }
  return <FileText className="h-4 w-4 text-red-500" />;
}

export default function DocumentUploadStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const { confirm } = useConfirm();
  const student = getActiveStudent();

  const documents = student?.documents || [];
  const status = student?.status || 'registration';

  const isSubmitted = status === 'documents_submitted' || status === 'documents_approved' || status === 'advising_pending' || status === 'advising_approved' || status === 'enrollment_pending';
  const isEditable = status === 'registration' || status === 'documents_submitted' || status === 'documents_rejected';

  const submitOnCampus = student?.submitDocumentsOnCampus || false;

  const handleToggleCampusSubmission = async (checked) => {
    await dispatch({
      type: 'UPDATE_ACTIVE_STUDENT',
      payload: { submitDocumentsOnCampus: checked },
    });
  };

  // Track which document types are currently uploading
  const [uploadingTypes, setUploadingTypes] = useState(new Set());
  // Track which document type has drag-over active
  const [dragOverType, setDragOverType] = useState(null);

  // Refs for hidden file inputs, keyed by document type
  const fileInputRefs = useRef({});

  function getDocByTypeId(typeId) {
    return documents.find((d) => d.typeId === typeId);
  }

  const validateFile = useCallback((file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large (${formatFileSize(file.size)}). Maximum size is 5MB.`);
      return false;
    }
    return true;
  }, []);

  async function handleFileSelected(typeId, file) {
    if (!file || !validateFile(file)) return;

    setUploadingTypes((prev) => new Set(prev).add(typeId));

    try {
      await dispatch({
        type: 'UPLOAD_DOCUMENT',
        payload: { typeId, file },
      });
      toast.success(`${file.name} uploaded successfully`);
    } catch (err) {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploadingTypes((prev) => {
        const next = new Set(prev);
        next.delete(typeId);
        return next;
      });
      // Reset the file input so the same file can be re-selected if needed
      if (fileInputRefs.current[typeId]) {
        fileInputRefs.current[typeId].value = '';
      }
    }
  }

  function handleUploadClick(typeId) {
    fileInputRefs.current[typeId]?.click();
  }

  function handleInputChange(typeId, event) {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelected(typeId, file);
    }
  }

  function handleRemove(typeId) {
    dispatch({ type: 'REMOVE_DOCUMENT', payload: { typeId } });
  }

  async function handleSubmit() {
    const isConfirmed = await confirm({
      title: 'Submit Application',
      message: 'Are you sure you want to submit your application and documents for review? You may not be able to edit some details once submitted.',
      confirmText: 'Yes, Submit Application',
      cancelText: 'Cancel',
      type: 'success'
    });

    if (isConfirmed) {
      dispatch({ type: 'SUBMIT_DOCUMENTS' });
    }
  }

  // Drag-and-drop handlers
  function handleDragOver(e, typeId) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverType(typeId);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverType(null);
  }

  function handleDrop(e, typeId) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverType(null);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(typeId, file);
    }
  }

  const requiredDocs = REQUIRED_DOCUMENTS.filter((d) => {
    if (submitOnCampus) {
      return d.id === 'form-138';
    }
    return d.required;
  });
  const allRequiredUploaded = requiredDocs.every((d) => getDocByTypeId(d.id));

  function renderStatusIcon(docStatus) {
    switch (docStatus) {
      case 'approved':
        return <Check className="h-4 w-4 text-emerald-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'rejected':
        return <X className="h-4 w-4 text-rose-600" />;
      default:
        return null;
    }
  }

  function renderStatusLabel(docStatus) {
    switch (docStatus) {
      case 'approved':
        return <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200">Approved</span>;
      case 'pending':
        return <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">Pending Review</span>;
      case 'rejected':
        return <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-wider border border-rose-200">Rejected</span>;
      default:
        return null;
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-premium">
      <h1 className="text-2xl font-heading font-extrabold text-univ-navy mb-2">Upload Documents</h1>
      <p className="text-sm text-slate-500 mb-2 leading-relaxed font-medium">
        Please upload the required files for your NCST admission evaluation.
      </p>
      <p className="text-[10px] text-slate-400 mb-6 font-extrabold uppercase tracking-widest">
        Accepted formats: PDF, JPEG, PNG — Max size: 5MB per file
      </p>
 
      {/* Submitted banner */}
      {isSubmitted && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/50 rounded-xl p-4 mb-6 shadow-sm">
          <AlertCircle className="h-5 w-5 text-univ-gold shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-extrabold text-univ-gold uppercase tracking-wider">Documents Submitted</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
              Your files have been successfully submitted for review. They are currently being evaluated by the Admissions office. You can still update or replace your documents below while review is pending.
            </p>
          </div>
        </div>
      )}
 
      {/* Rejected banner */}
      {status === 'documents_rejected' && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200/50 rounded-xl p-4 mb-6 shadow-sm">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-extrabold text-rose-700 uppercase tracking-wider">Resubmission Required</p>
            <p className="text-xs text-rose-600 mt-1 leading-relaxed font-medium">
              Some of your documents were not approved. Please review the feedback, upload corrected copies, and submit again.
            </p>
          </div>
        </div>
      )}
 
      {/* On-Campus physical submission option */}
      {!isSubmitted && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 mb-6 flex items-start gap-3.5 shadow-sm hover:border-slate-300 transition-all duration-200">
          <input
            type="checkbox"
            id="submit-on-campus"
            checked={submitOnCampus}
            onChange={(e) => handleToggleCampusSubmission(e.target.checked)}
            className="mt-1 h-4.5 w-4.5 text-univ-blue border-slate-300 rounded focus:ring-univ-blue cursor-pointer transition-all"
          />
          <label htmlFor="submit-on-campus" className="cursor-pointer select-none">
            <span className="text-xs font-extrabold text-univ-navy block uppercase tracking-wide">Submit remaining documents on-campus</span>
            <span className="text-[11px] text-slate-500 mt-1 block leading-relaxed font-medium">
              Check this option if you prefer to submit your Form 137 and PSA Birth Certificate physically at the Office of the Registrar. **Form 138 (Report Card) must still be uploaded online** to proceed with academic evaluation.
            </span>
          </label>
        </div>
      )}

      <div className="space-y-4">
        {REQUIRED_DOCUMENTS.map((doc) => {
          const uploaded = getDocByTypeId(doc.id);
          const isUploading = uploadingTypes.has(doc.id);
          const isDragOver = dragOverType === doc.id;
 
          return (
            <div key={doc.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-univ-blue/30 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-univ-navy uppercase tracking-wide">{doc.label}</span>
                  {doc.required && (
                    doc.id === 'form-138' ? (
                      <span className="text-[9px] bg-rose-50 border border-rose-100 text-rose-600 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Required</span>
                    ) : submitOnCampus ? (
                      <span className="text-[9px] bg-amber-50 border border-amber-100 text-amber-600 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">On-Campus</span>
                    ) : (
                      <span className="text-[9px] bg-rose-50 border border-rose-100 text-rose-600 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Required</span>
                    )
                  )}
                </div>
                {uploaded && renderStatusLabel(uploaded.status)}
              </div>
 
              {/* Hidden file input */}
              <input
                ref={(el) => (fileInputRefs.current[doc.id] = el)}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => handleInputChange(doc.id, e)}
                disabled={!isEditable || isUploading}
              />
 
              {isUploading ? (
                /* Uploading state */
                <div className="w-full border-2 border-dashed border-univ-blue/30 bg-univ-blue/5 rounded-xl p-6 flex flex-col items-center gap-2">
                  <Loader2 className="h-5 w-5 text-univ-blue animate-spin" />
                  <span className="text-xs text-univ-blue font-bold">Uploading file to server...</span>
                </div>
              ) : uploaded ? (
                /* Uploaded file display */
                <div className="flex items-center justify-between bg-slate-50/50 rounded-xl border border-slate-200/80 p-3 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getFileIcon(uploaded.originalName || uploaded.fileName)}
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-700 block truncate max-w-[220px]">
                        {uploaded.originalName || uploaded.fileName}
                      </span>
                      {uploaded.uploadedAt && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          Uploaded {new Date(uploaded.uploadedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStatusIcon(uploaded.status)}
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => handleRemove(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-200/80 transition-colors cursor-pointer"
                        title="Remove document"
                      >
                        <X className="h-4 w-4 text-slate-400 hover:text-rose-600" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Drop zone / upload trigger */
                <button
                  type="button"
                  onClick={() => handleUploadClick(doc.id)}
                  onDragOver={(e) => handleDragOver(e, doc.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, doc.id)}
                  disabled={!isEditable}
                  className={`w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                    isDragOver
                      ? 'border-univ-blue bg-univ-blue/[0.02]'
                      : 'border-slate-200 bg-slate-50 hover:bg-blue-50/50 hover:border-univ-blue/30'
                  }`}
                >
                  <Upload className={`h-5 w-5 ${isDragOver ? 'text-univ-blue' : 'text-slate-400'}`} />
                  <span className={`text-xs ${isDragOver ? 'text-univ-blue font-bold' : 'text-slate-500 font-semibold'}`}>
                    {isDragOver ? 'Drop file here' : 'Click to select or drag and drop here'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">PDF, JPEG, or PNG up to 5MB</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
 
      {/* Progress indicator */}
      <div className="mt-6 flex items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
        <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden shadow-inner">
          <div
            className="bg-univ-blue h-full rounded-full transition-all duration-300 shadow-sm"
            style={{ width: `${(documents.length / REQUIRED_DOCUMENTS.length) * 100}%` }}
          />
        </div>
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-extrabold whitespace-nowrap">
          {documents.length} of {REQUIRED_DOCUMENTS.length} uploaded
        </span>
      </div>
 
      {/* Actions */}
      <div className="flex items-center justify-between mt-8 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-extrabold text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          Back
        </button>
        <div className="flex items-center gap-3">
          {!isSubmitted && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allRequiredUploaded}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-extrabold text-white transition-all shadow-md cursor-pointer ${
                allRequiredUploaded
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 hover:shadow-lg hover:-translate-y-0.5'
                  : 'bg-slate-300 opacity-50 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Submit Application
            </button>
          )}
          {isSubmitted && (
            <button
              type="button"
              onClick={onNext}
              disabled={!allRequiredUploaded}
              className={`px-8 py-3 rounded-xl text-xs font-extrabold text-white transition-all shadow-md cursor-pointer ${
                allRequiredUploaded
                  ? 'bg-univ-blue hover:bg-blue-700 shadow-univ-blue/20 hover:shadow-lg hover:-translate-y-0.5'
                  : 'bg-slate-300 opacity-55 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
