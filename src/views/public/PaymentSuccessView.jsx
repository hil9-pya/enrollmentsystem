import React, { useState, useEffect } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { CheckCircle, ArrowRight, Loader2, FileText, ShieldCheck } from 'lucide-react';

export default function PaymentSuccessView() {
  const { dispatch, setActiveStudent } = useEnrollment();
  const [sessionId] = useState(() => {
    return new URLSearchParams(window.location.search).get('session_id') || '';
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifiedStudent, setVerifiedStudent] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing checkout session ID.');
      setIsLoading(false);
      return;
    }

    async function verifyPayment() {
      try {
        // 1. Get the session details to extract student reference _id
        const sessionRes = await fetch(`/api/paymongo/v1/checkout_sessions/${sessionId}`);
        if (!sessionRes.ok) {
          throw new Error('Failed to retrieve checkout session details.');
        }
        const sessionData = await sessionRes.json();
        const studentRef = sessionData.data?.attributes?.reference_number;

        if (!studentRef) {
          throw new Error('No student reference found in payment session.');
        }

        // Set this student as the active student in context so dispatch uses correct ID
        setActiveStudent(studentRef);

        // 2. Call the verify-paymongo-payment endpoint on the backend
        const verifyRes = await fetch(`/api/students/${studentRef}/verify-paymongo-payment?session_id=${sessionId}`);
        if (!verifyRes.ok) {
          let errDetail = 'Failed to verify online payment with registrar database';
          try {
            const errJson = await verifyRes.json();
            errDetail = errJson.error || errJson.message || errDetail;
          } catch {}
          throw new Error(errDetail);
        }

        const studentData = await verifyRes.json();
        setVerifiedStudent(studentData);

        // Sync local context state
        dispatch({ type: 'VERIFY_PAYMONGO_PAYMENT', payload: { sessionId } });
      } catch (err) {
        console.error('Verification error:', err);
        setError(err.message || 'Payment verification failed.');
      } finally {
        setIsLoading(false);
      }
    }

    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleContinue = () => {
    // Redirect to student portal where they will resume on fulfillment/COR step
    window.location.href = '/?portal=student';
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f4f6fb]">
        <Loader2 className="w-12 h-12 text-[#3b82f6] animate-spin mb-4" />
        <h3 className="text-sm font-extrabold text-slate-700 tracking-wider">VERIFYING ONLINE TUITION PAYMENT...</h3>
        <p className="text-slate-400 text-xs mt-1">Please do not refresh or close this window.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f4f6fb] p-6 text-center">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 shadow-xl">
          <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">Verification Failed</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">{error}</p>
          <button
            onClick={() => (window.location.href = '/?portal=student')}
            className="w-full py-3 bg-[#0d1e3d] text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Return to Student Portal
          </button>
        </div>
      </div>
    );
  }

  const amountPaid = verifiedStudent?.paymentDetails?.amount || verifiedStudent?.totalTuition || 0;

  return (
    <div className="min-h-screen w-full bg-[#f4f6fb] flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white max-w-lg w-full rounded-3xl border border-slate-200/80 shadow-premium p-8 sm:p-10 text-center animate-in fade-in zoom-in duration-300">
        
        {/* Animated Check Banner */}
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 shadow-inner">
          <CheckCircle className="w-10 h-10 text-emerald-500 animate-pulse" />
        </div>

        <span className="text-[10px] font-extrabold tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">
          Online Payment Settled
        </span>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0d1e3d] mt-4 mb-2 tracking-tight">
          Tuition Payment Cleared!
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed font-medium">
          Congratulations! Your payment has been processed and automatically verified by NCST Secure Online Billing. You are now officially enrolled!
        </p>

        {/* Receipt Details Card */}
        <div className="bg-[#f8fafc] border border-slate-200/50 rounded-2xl p-6 text-left my-8 space-y-4">
          <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-200/50 pb-2.5">
            Official Receipt Summary
          </h4>
          
          <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Student Name</p>
              <p className="font-extrabold text-[#0d1e3d]">{verifiedStudent?.firstName} {verifiedStudent?.lastName}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Student ID Assigned</p>
              <p className="font-mono font-extrabold text-[#0d1e3d]">{verifiedStudent?.studentId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">OR Receipt No.</p>
              <p className="font-mono font-extrabold text-[#0d1e3d]">{verifiedStudent?.receiptNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Amount Paid</p>
              <p className="font-mono font-extrabold text-emerald-600">
                ₱{amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Payment Method</p>
              <p className="font-extrabold text-[#0d1e3d] uppercase">
                {verifiedStudent?.paymentDetails?.paymentMethod || verifiedStudent?.paymentMethod || 'PayMongo Online'}
              </p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Transaction Date</p>
              <p className="font-extrabold text-[#0d1e3d]">
                {verifiedStudent?.paymentDetails?.paidAt 
                  ? new Date(verifiedStudent.paymentDetails.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                }
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200/60 pt-4 flex items-center justify-between text-[11px] text-slate-500 font-semibold leading-relaxed">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#3b82f6]" />
              Secured by PayMongo
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <FileText className="w-3.5 h-3.5" />
              Receipt Auto-Generated
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleContinue}
            className="w-full py-4 px-6 bg-[#0d1e3d] hover:bg-slate-800 text-white text-xs font-extrabold uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-slate-900/10 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 group"
          >
            Go to Student Dashboard
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          
          <p className="text-[10px] text-slate-400 font-medium">
            A copy of your Certificate of Registration (COR) and receipt will be available on your portal.
          </p>
        </div>

      </div>
    </div>
  );
}
