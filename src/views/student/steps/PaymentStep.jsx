import React, { useState, useEffect } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { useConfirm } from '../../../context/ConfirmationContext';
import { PAYMENT_METHODS } from '../../../data/mockData';
import { Banknote, Building2, CreditCard, Smartphone, ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function PaymentStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const { confirm } = useConfirm();
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

  const handleProcessPayment = async () => {
    const isConfirmed = await confirm({
      title: 'Authorize Payment',
      message: `Are you sure you want to authorize the simulated payment of ₱${student?.totalTuition?.toLocaleString('en-US', { minimumFractionDigits: 2 })}? This initiates simulated bank gateway settlement.`,
      confirmText: 'Process Payment',
      cancelText: 'Cancel',
      type: 'warning',
    });
    if (!isConfirmed) return;
    setIsProcessing(true);
    // Simulate processing delay
    setTimeout(() => {
      setIsProcessing(false);
      // Always succeed simulated payment to ensure test and demo reliability
      const success = true;
      dispatch({ type: 'PROCESS_PAYMENT', payload: { success } });
    }, 1500);
  };

  // If already paid in state (due to role updates or previous actions), skip manual trigger
  const isPaid = paymentStatus === 'paid' || ['payment_confirmed', 'validation_pending', 'enrolled'].includes(student?.status);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-premium">
        <h2 className="text-xl font-extrabold text-univ-navy mb-1.5">Tuition Assessment &amp; Payment Portal</h2>
        <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium">
          Review your tuition fees assessment and complete the simulation payment process to proceed with official validation.
        </p>

        {/* 1. Tuition Ledger Breakdown */}
        <div className="border border-slate-200/85 rounded-xl overflow-hidden mb-8 shadow-sm">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
            Assessment Ledger Breakdown
          </div>
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-slate-100 bg-white">
              {student?.tuitionBreakdown && student.tuitionBreakdown.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/30">
                  <td className="px-4 py-3.5 text-slate-600 font-semibold">{item.label}</td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-univ-navy">
                    ₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/60 border-t border-slate-200 font-extrabold">
                <td className="px-4 py-4 text-[10px] text-slate-500 uppercase tracking-wider">Total Assessed Tuition &amp; Fees</td>
                <td className="px-4 py-4 text-right font-mono text-univ-navy text-base">
                  ₱{student?.totalTuition ? student.totalTuition.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 2. Payment Method Selector */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Select Payment Method</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {PAYMENT_METHODS.map((method) => {
              const IconComp = iconMap[method.icon] || Banknote;
              const isSelected = selectedMethodId === method.id;

              return (
                <div
                  key={method.id}
                  onClick={() => handleSelectMethod(method.id)}
                  className={`border rounded-xl p-4.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 shadow-sm ${
                    isPaid ? 'opacity-55 cursor-not-allowed' : 'hover:border-slate-300 hover:shadow-premium'
                  } ${
                    isSelected
                      ? 'border-univ-indigo bg-univ-indigo/[0.02] ring-2 ring-univ-indigo/10'
                      : 'border-slate-100 bg-white'
                  }`}
                >
                  <IconComp className={`h-6 w-6 mb-2.5 transition-colors ${isSelected ? 'text-univ-indigo' : 'text-slate-400'}`} />
                  <span className={`text-[10px] font-extrabold uppercase tracking-wide transition-colors ${isSelected ? 'text-univ-navy' : 'text-slate-500'}`}>
                    {method.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Transaction Feedback Banners */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-6 mb-4">
            <Loader2 className="h-5 w-5 animate-spin text-univ-indigo" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Simulating payment gateway clearance... Please wait.</span>
          </div>
        )}

        {isPaid && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200/50 rounded-xl p-4.5 mb-4">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Transaction Cleared</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Your payment of ₱{student?.totalTuition?.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been verified and approved by the Accounting department.
              </p>
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && !isProcessing && (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200/50 rounded-xl p-4.5 mb-4">
            <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider">Transaction Declined</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                The simulated transaction was declined. Please try again or select a different payment channel.
              </p>
            </div>
          </div>
        )}

        {/* Action Button for Process Payment */}
        {!isPaid && !isProcessing && (
          <div className="flex justify-end mt-4">
            <button
              onClick={handleProcessPayment}
              disabled={!selectedMethodId}
              className={`px-6 py-2.5 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer ${
                selectedMethodId
                  ? 'bg-univ-indigo text-white hover:bg-univ-blue'
                  : 'bg-slate-300 opacity-50 cursor-not-allowed'
              }`}
            >
              {paymentStatus === 'failed' ? 'Re-attempt Gateway Simulation' : 'Process Simulated Payment'}
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center mt-8 border-t border-slate-100 pt-6">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <button
          onClick={onNext}
          disabled={!isPaid}
          className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
            isPaid
              ? 'bg-univ-indigo hover:bg-univ-blue'
              : 'bg-slate-300 opacity-50 cursor-not-allowed'
          }`}
        >
          Proceed to Verification
        </button>
      </div>
    </div>
  );
}
