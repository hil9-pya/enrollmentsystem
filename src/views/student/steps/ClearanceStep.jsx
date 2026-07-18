import React, { useRef, useState } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { AlertCircle, FileText, CheckCircle, Upload, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ClearanceStep({ onNext }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const student = getActiveStudent();
  const holds = student?.holds || [];
  
  const activeHolds = holds.filter(h => h.status === 'active');
  const hasActiveHolds = activeHolds.length > 0;
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const clearanceDoc = student?.documents?.find(d => d.typeId === 'readmission_clearance');

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      await dispatch({
        type: 'UPLOAD_DOCUMENT',
        payload: { typeId: 'readmission_clearance', file },
      });
      toast.success('Clearance document uploaded successfully');
    } catch (err) {
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!hasActiveHolds) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">You are cleared for enrollment!</h2>
        <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
          You have no active holds on your account. You may proceed to the next step.
        </p>
        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-univ-indigo text-white font-bold text-sm rounded-lg hover:bg-univ-blue transition-colors cursor-pointer"
        >
          Continue to Enrollment
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-premium">
      <h1 className="text-xl font-extrabold text-univ-navy flex items-center gap-2 mb-2">
        <AlertCircle className="w-6 h-6 text-amber-500" />
        Account Hold Detected
      </h1>
      <p className="text-xs text-slate-500 mb-8 font-medium">
        You have active holds on your account that prevent you from enrolling. Please resolve them below.
      </p>

      <div className="space-y-4 mb-8">
        {activeHolds.map((hold, idx) => (
          <div key={idx} className="p-4 border border-rose-200 bg-rose-50 rounded-xl flex items-start gap-4">
            <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900 capitalize">{hold.type} Hold</h3>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                {hold.description || `You have an active ${hold.type} hold. You must secure clearance to proceed.`}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
        <h3 className="text-sm font-bold text-slate-800 mb-2">Submit Clearance Document</h3>
        <p className="text-xs text-slate-500 mb-4">
          Please upload your approved clearance form, letter of intent, or proof of payment depending on the hold type.
        </p>

        {clearanceDoc ? (
          <div className="p-4 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-500 flex items-center justify-center rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">{clearanceDoc.originalName || clearanceDoc.fileName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    clearanceDoc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    clearanceDoc.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {clearanceDoc.status}
                  </span>
                </div>
              </div>
            </div>
            {clearanceDoc.status === 'rejected' && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold text-univ-indigo hover:text-univ-blue px-3 py-1.5 border border-slate-200 rounded-md bg-white shadow-sm cursor-pointer"
              >
                Re-upload
              </button>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-8 border-2 border-dashed border-slate-300 hover:border-univ-indigo bg-white hover:bg-slate-50 transition-all rounded-xl flex flex-col items-center justify-center group cursor-pointer"
            >
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-univ-indigo animate-spin mb-3" />
              ) : (
                <div className="w-12 h-12 bg-slate-100 group-hover:bg-indigo-50 text-slate-400 group-hover:text-univ-indigo rounded-full flex items-center justify-center mb-3 transition-colors">
                  <Upload className="w-5 h-5" />
                </div>
              )}
              <span className="text-sm font-bold text-slate-600 group-hover:text-univ-indigo transition-colors">
                {isUploading ? 'Uploading...' : 'Click to upload document'}
              </span>
              <span className="text-xs text-slate-400 mt-1">PDF, JPG, or PNG (Max 5MB)</span>
            </button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
        />
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
         <button
          onClick={onNext}
          disabled={true}
          className="px-6 py-2.5 bg-slate-200 text-slate-400 cursor-not-allowed font-bold text-sm rounded-lg"
        >
          Waiting for Clearance...
        </button>
      </div>
    </div>
  );
}
