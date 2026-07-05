import React, { useState, useEffect } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { PAYMENT_METHODS } from '../../../data/mockData';
import { Banknote, Building2, CreditCard, Smartphone, ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function PaymentStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const student = getActiveStudent();

  const selectedMethodId = student?.paymentMethod;
  const paymentStatus = student?.paymentStatus || 'unpaid';

  const [isProcessing, setIsProcessing] = useState(false);

  // Icon mapping
  const iconMap = {
    Banknote: Banknote,
    Building2: Building2,
    CreditCard: CreditCard,
    Smartphone: Smartphone,
  };

  const handleSelectMethod = (methodId) => {
    if (paymentStatus === 'paid') return;
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: { method: methodId } });
  };

  const handleProcessPayment = () => {
    setIsProcessing(true);
    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false);
      // 80% success rate simulation
      const success = Math.random() > 0.2;
      dispatch({ type: 'PROCESS_PAYMENT', payload: { success } });
    }, 1500);
  };

  // If already paid in state (due to role updates or previous actions), skip manual trigger
  const isPaid = paymentStatus === 'paid' || ['payment_confirmed', 'validation_pending', 'enrolled'].includes(student?.status);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Tuition Assessment & Payment Portal</h2>
        <p className="text-sm text-slate-500 mb-6">
          Review your tuition fees assessment and complete the simulation payment process to proceed with official validation.
        </p>

        {/* 1. Tuition Ledger Breakdown */}
        <div className="border border-slate-200 rounded-md overflow-hidden mb-6">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Assessment Ledger</h3>
          </div>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {student?.tuitionBreakdown && student.tuitionBreakdown.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-700 font-medium">{item.label}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-900">
                    ₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t border-slate-200 font-bold">
                <td className="px-4 py-3.5 text-slate-900">Total Assessed Tuition & Fees</td>
                <td className="px-4 py-3.5 text-right font-mono text-slate-900 text-base">
                  ₱{student?.totalTuition ? student.totalTuition.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 2. Payment Method Selector */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Select Payment Method</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PAYMENT_METHODS.map((method) => {
              const IconComp = iconMap[method.icon] || Banknote;
              const isSelected = selectedMethodId === method.id;

              return (
                <div
                  key={method.id}
                  onClick={() => handleSelectMethod(method.id)}
                  className={`border rounded-md p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ${
                    isPaid ? 'opacity-60 cursor-default' : ''
                  } ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/20 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <IconComp className={`h-6 w-6 mb-2 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                    {method.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Transaction Feedback Banners */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-3 bg-slate-50 border border-slate-200 rounded-md p-6 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">Simulating bank clearance gateway... Please wait.</span>
          </div>
        )}

        {isPaid && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-4">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-800">Transaction Approved & Confirmed</h4>
              <p className="text-xs text-emerald-700 mt-1">
                Your payment of ₱{student?.totalTuition?.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been verified and cleared by Accounting. Status: <span className="font-bold">PAID</span>.
              </p>
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && !isProcessing && (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-md p-4 mb-4">
            <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-rose-800">Payment Gateway Declined</h4>
              <p className="text-xs text-rose-700 mt-1">
                Transaction simulation declined by security checkpoint. Please check credentials or retry payment gateway.
              </p>
            </div>
          </div>
        )}

        {/* Action Button for Process Payment */}
        {!isPaid && !isProcessing && (
          <div className="flex justify-end">
            <button
              onClick={handleProcessPayment}
              disabled={!selectedMethodId}
              className={`px-6 py-2.5 text-sm font-semibold rounded-md border transition-all ${
                selectedMethodId
                  ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 cursor-pointer shadow-sm'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {paymentStatus === 'failed' ? 'Re-attempt Gateway Simulation' : 'Process Simulated Payment'}
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>

        <button
          onClick={onNext}
          disabled={!isPaid}
          className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-md transition-colors ${
            isPaid
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Proceed to Verification <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
