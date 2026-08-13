import React, { useState, useEffect } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { CheckCircle, Loader2 } from 'lucide-react';
import { authFetch } from '../../utils/authFetch.js';

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
        const verifyRes = await authFetch(`/api/students/${studentRef}/verify-paymongo-payment?session_id=${sessionId}`);
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
            className="w-full rounded-lg bg-[#0d1e3d] px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-slate-800"
          >
            Return to student portal
          </button>
        </div>
      </div>
    );
  }

  const amountPaid = verifiedStudent?.paymentDetails?.amount || verifiedStudent?.totalTuition || 0;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f4f6fb] p-6 font-sans">
      <div className="w-full max-w-lg animate-in rounded-xl border border-slate-200 bg-white p-6 shadow-sm fade-in duration-300 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-[#0d1e3d]">Payment received</h2>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
              Payment is verified. Enrollment now awaits final validation by the Registrar.
            </p>
          </div>
        </div>

        <section className="mt-6" aria-labelledby="receipt-details-title">
          <h3 id="receipt-details-title" className="text-sm font-semibold text-[#0d1e3d]">Receipt details</h3>
          <dl className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 px-4 text-sm">
            <div className="flex items-start justify-between gap-6 py-3">
              <dt className="text-slate-500">Student</dt>
              <dd className="text-right font-medium text-[#0d1e3d]">{verifiedStudent?.firstName} {verifiedStudent?.lastName}</dd>
            </div>
            <div className="flex items-start justify-between gap-6 py-3">
              <dt className="text-slate-500">Application ID</dt>
              <dd className="font-mono text-right font-medium text-[#0d1e3d]">{verifiedStudent?.id || 'N/A'}</dd>
            </div>
            <div className="flex items-start justify-between gap-6 py-3">
              <dt className="text-slate-500">Payment reference</dt>
              <dd className="break-all font-mono text-right font-medium text-[#0d1e3d]">{verifiedStudent?.paymentReference || verifiedStudent?.paymentDetails?.referenceCode || 'N/A'}</dd>
            </div>
            <div className="flex items-start justify-between gap-6 py-3">
              <dt className="text-slate-500">Amount paid</dt>
              <dd className="font-mono text-right font-semibold text-emerald-700">₱{amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</dd>
            </div>
            <div className="flex items-start justify-between gap-6 py-3">
              <dt className="text-slate-500">Payment method</dt>
              <dd className="text-right font-medium text-[#0d1e3d]">{verifiedStudent?.paymentDetails?.paymentMethod || verifiedStudent?.paymentMethod || 'PayMongo online'}</dd>
            </div>
            <div className="flex items-start justify-between gap-6 py-3">
              <dt className="text-slate-500">Transaction date</dt>
              <dd className="text-right font-medium text-[#0d1e3d]">
                {verifiedStudent?.paymentDetails?.paidAt
                  ? new Date(verifiedStudent.paymentDetails.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">Payment processed securely by PayMongo.</p>
        </section>

        <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
          <p className="max-w-xs text-xs leading-relaxed text-slate-500">
            Registration documents and receipt will be available in the student portal.
          </p>
          <button
            onClick={handleContinue}
            className="shrink-0 rounded-lg bg-[#0d1e3d] px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-slate-800 cursor-pointer"
          >
            Go to student portal
          </button>
        </div>
      </div>
    </div>
  );
}
