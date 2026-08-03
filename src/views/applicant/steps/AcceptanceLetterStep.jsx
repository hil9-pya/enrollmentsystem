import React from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { Mail, Clock, AlertTriangle, CheckCircle } from 'lucide-react';


export default function AcceptanceLetterStep() {
  const { getActiveStudent } = useEnrollment();
  const student = getActiveStudent();

  if (!student) return null;


  const isApproved = ['documents_approved', 'advising_pending', 'advising_approved', 'payment_pending', 'payment_confirmed', 'validation_pending', 'enrolled'].includes(student.status);
  const isRejected = student.status === 'documents_rejected';

  if (!isApproved && !isRejected) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-5">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <h2 className="text-sm font-semibold text-univ-navy">Application under review</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
            Admission staff are reviewing your documents. Check this page later or wait for an email update.
          </p>
        </div>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-rose-700">Resubmission required</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Some submitted documents need attention. Review the admission note and upload corrected files.
            </p>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-univ-navy">Admission note</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{student.admissionNotes || 'No specific note was provided. Make sure every document is clear and valid.'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-premium border border-slate-100 overflow-hidden">
      <div className="bg-univ-navy p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/pattern.svg')]"></div>
        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
          <Mail className="w-8 h-8 text-white" />
        </div>
        <h2 className="relative z-10 text-xl font-semibold text-white">Acceptance notification</h2>
        <p className="text-blue-100 mt-2 relative z-10">Official Admission Summary</p>
      </div>

      <div className="p-10">
        <div className="prose prose-slate max-w-none text-slate-600">
          <p className="font-bold text-lg text-univ-navy">Dear {student.firstName} {student.lastName},</p>
          
          <p>Congratulations! We are pleased to inform you that your application for admission to the National College of Science & Technology for the Academic Year 2026-2027 has been <strong>approved</strong>.</p>
          
          <p>Your submitted credentials have met our admission standards. You are now officially cleared to proceed to the next steps of your enrollment.</p>

          <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl my-8">
            <h3 className="text-sm font-extrabold text-univ-navy uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle size={16} className="text-blue-600" />
              Your Student Credentials
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Student ID (Username)</p>
                <p className="text-lg font-mono font-bold text-univ-navy mt-1">{student.studentId || 'Pending'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">School Email</p>
                <p className="text-lg font-mono font-bold text-univ-navy mt-1">{student.schoolEmail || 'Pending'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Temporary Password</p>
                <p className="text-lg font-mono font-bold text-univ-navy mt-1">NCST2026!</p>
              </div>
            </div>
            <p className="text-xs text-blue-800 mt-4 font-medium italic">
              * Please keep these credentials secure. You will need them to log in to the Student Portal.
            </p>
          </div>

          <p>To continue with your enrollment (course evaluation, subject enrollment, and payment), please log in to the Student Portal using your new credentials.</p>
          
          <p className="mt-8">Welcome to NCST!</p>
          <p className="font-bold mt-2">The Admissions Office</p>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => {
              // Redirect to student portal
              window.location.href = '/?portal=gateway&tab=student';
            }}
            className="rounded-lg bg-univ-navy px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-univ-navy/90 cursor-pointer"
          >
            Go to student portal
          </button>
        </div>
      </div>
    </div>
  );
}
