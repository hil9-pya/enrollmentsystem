import React, { useRef, useState, useCallback } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { REQUIRED_DOCUMENTS } from '../../../data/mockData';
import { Upload, FileText, Check, Clock, X, AlertCircle, Loader2, Image } from 'lucide-react';
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
  const student = getActiveStudent();

  const documents = student?.documents || [];
  const status = student?.status || 'registration';
  const isSubmitted = status === 'documents_submitted' || status === 'documents_approved' || status === 'advising_pending' || status === 'advising_approved' || status === 'enrollment_pending';

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

  function handleSubmit() {
    dispatch({ type: 'SUBMIT_DOCUMENTS' });
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

  const requiredDocs = REQUIRED_DOCUMENTS.filter((d) => d.required);
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
        return <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Approved</span>;
      case 'pending':
        return <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Pending Review</span>;
      case 'rejected':
        return <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">Rejected</span>;
      default:
        return null;
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Upload Documents</h1>
      <p className="text-sm text-slate-500 mt-1 mb-2">
        Upload the required documents for your enrollment application.
      </p>
      <p className="text-xs text-slate-400 mb-6">
        Accepted formats: PDF, JPEG, PNG — Max size: 5MB per file
      </p>

      {/* Submitted banner */}
      {isSubmitted && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Documents Submitted</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Your documents have been submitted for review. You will be notified once they are approved.
            </p>
          </div>
        </div>
      )}

      {/* Rejected banner */}
      {status === 'documents_rejected' && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-md p-4 mb-6">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-rose-800">Resubmission Required</p>
            <p className="text-sm text-rose-700 mt-0.5">
              Some of your documents were rejected. Please re-upload the rejected documents and resubmit.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {REQUIRED_DOCUMENTS.map((doc) => {
          const uploaded = getDocByTypeId(doc.id);
          const isUploading = uploadingTypes.has(doc.id);
          const isDragOver = dragOverType === doc.id;

          return (
            <div key={doc.id} className="bg-white border border-slate-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{doc.label}</span>
                  {doc.required && (
                    <span className="text-xs text-rose-600 font-medium">Required</span>
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
                disabled={isSubmitted || isUploading}
              />

              {isUploading ? (
                /* Uploading state */
                <div className="w-full border-2 border-dashed border-indigo-300 bg-indigo-50 rounded-md p-4 flex flex-col items-center gap-2">
                  <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                  <span className="text-sm text-indigo-600 font-medium">Uploading...</span>
                </div>
              ) : uploaded ? (
                /* Uploaded file display */
                <div className="flex items-center justify-between bg-slate-50 rounded-md px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {getFileIcon(uploaded.originalName || uploaded.fileName)}
                    <div className="min-w-0">
                      <span className="text-sm text-slate-700 block truncate max-w-[220px]">
                        {uploaded.originalName || uploaded.fileName}
                      </span>
                      {uploaded.uploadedAt && (
                        <span className="text-xs text-slate-400">
                          Uploaded {new Date(uploaded.uploadedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStatusIcon(uploaded.status)}
                    {!isSubmitted && (
                      <button
                        type="button"
                        onClick={() => handleRemove(doc.id)}
                        className="p-1 rounded hover:bg-slate-200 transition-colors duration-150"
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
                  disabled={isSubmitted}
                  className={`w-full border-2 border-dashed rounded-md p-4 flex flex-col items-center gap-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDragOver
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Upload className={`h-5 w-5 ${isDragOver ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <span className={`text-sm ${isDragOver ? 'text-indigo-600 font-medium' : 'text-slate-500'}`}>
                    {isDragOver ? 'Drop file here' : 'Click to upload or drag and drop'}
                  </span>
                  <span className="text-xs text-slate-400">PDF, JPEG, or PNG up to 5MB</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress indicator */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(documents.length / REQUIRED_DOCUMENTS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {documents.length} / {REQUIRED_DOCUMENTS.length} uploaded
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-slate-600 hover:text-slate-900 transition-colors duration-150"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          {!isSubmitted && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allRequiredUploaded}
              className={`px-6 py-2.5 rounded-md text-sm font-medium text-white transition-colors duration-150 ${
                allRequiredUploaded
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-indigo-600 opacity-50 cursor-not-allowed'
              }`}
            >
              Submit Documents
            </button>
          )}
          {isSubmitted && (
            <button
              type="button"
              onClick={onNext}
              className="px-6 py-2.5 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-150"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
