import React from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { Mail, ArrowRight, Clock, AlertTriangle, CheckCircle } from 'lucide-react';


export default function AcceptanceLetterStep() {
  const { getActiveStudent } = useEnrollment();
  const student = getActiveStudent();

  if (!student) return null;


  const isApproved = ['documents_approved', 'advising_pending', 'advising_approved', 'payment_pending', 'payment_confirmed', 'validation_pending', 'enrolled'].includes(student.status);
  const isRejected = student.status === 'documents_rejected';

  if (!isApproved && !isRejected) {
    return (
      <div className="bg-white rounded-2xl shadow-premium border border-slate-100 p-10 text-center">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-univ-navy mb-4">Application Under Review</h2>
        <p className="text-slate-600 max-w-lg mx-auto leading-relaxed">
          Your documents have been submitted and are currently being reviewed by our admission staff. Please check back later or wait for an email notification regarding your admission status.
        </p>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div className="bg-white rounded-2xl shadow-premium border border-rose-100 p-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500"></div>
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-univ-navy mb-4">Resubmission Required</h2>
        <p className="text-slate-600 max-w-lg mx-auto leading-relaxed mb-6">
          There was an issue with your submitted documents. Please check the admission notes below and re-upload the required files.
        </p>
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-left max-w-lg mx-auto">
          <p className="font-bold text-sm mb-1">Admission Notes:</p>
          <p className="text-sm">{student.admissionNotes || 'No specific notes provided. Please ensure all documents are clear and valid.'}</p>
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
        <h2 className="text-2xl font-extrabold text-white relative z-10">Acceptance Notification</h2>
        <p className="text-blue-100 mt-2 relative z-10">Simulation of Official Email</p>
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
              window.location.href = '/?portal=student';
            }}
            className="flex items-center gap-2 px-6 py-3 bg-univ-navy hover:bg-univ-navy/90 text-white rounded-xl font-bold transition-all shadow-sm group"
          >
            Go to Student Portal
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
