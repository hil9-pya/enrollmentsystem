import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, Receipt } from 'lucide-react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useConfirm } from '../../context/ConfirmationContext';
import { PROGRAMS } from '../../data/mockData';

function formatPeso(amount) {
  if (amount == null) return '₱0';
  return '₱' + amount.toLocaleString('en-PH');
}

export default function PaymentVerification({ studentId, onBack }) {
  const { dispatch, getStudentById } = useEnrollment();
  const { confirm } = useConfirm();
  const [flashMessage, setFlashMessage] = useState(null);

  const student = getStudentById(studentId);
  const program = student ? PROGRAMS.find(p => p.id === student.programId) : null;

  if (!student) return null;

  function showFlash(message, type = 'success') {
    setFlashMessage({ message, type });
    setTimeout(() => setFlashMessage(null), 3000);
  }

  async function handleConfirmPayment() {
    const isConfirmed = await confirm({
      title: 'Confirm Tuition Payment',
      message: `Are you sure you want to confirm the tuition payment of ${formatPeso(student.totalTuition)} for ${student.firstName} ${student.lastName}? This clears their accounting hold and moves them to final registration.`,
      confirmText: 'Confirm Payment',
      cancelText: 'Cancel',
      type: 'success',
    });
    
    if (!isConfirmed) return;

    await dispatch({ type: 'CONFIRM_PAYMENT', payload: { studentId: student.id } });
    showFlash(`Payment confirmed for ${student.firstName} ${student.lastName}`);
    setTimeout(() => onBack(), 1500);
  }

  const isPending = student.paymentStatus !== 'paid';

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-6 bg-white border-b border-slate-200/80 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-400 hover:text-univ-navy hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-extrabold text-univ-navy">
              {student.firstName} {student.lastName}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="font-mono text-slate-400">{student.id}</span>
              <span>&bull;</span>
              <span>{program?.name || 'No program selected'}</span>
              <span>&bull;</span>
              <span className="text-univ-gold">{student.enrollmentType}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Flash message */}
        {flashMessage && (
          <div
            className={`mx-8 mt-6 px-4 py-3 rounded-xl text-xs font-bold shadow-sm ${
              flashMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/40'
                : 'bg-rose-50 text-rose-700 border border-rose-200/40'
            }`}
          >
            {flashMessage.message}
          </div>
        )}

        <div className="p-8 space-y-6">
          {/* Payment Status Alert */}
          {!isPending ? (
            <div className="flex items-center gap-3.5 p-5 bg-emerald-50 border border-emerald-200/40 rounded-2xl shadow-sm">
              <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 stroke-[2]" />
              <div>
                <p className="text-xs font-bold text-emerald-800">Payment Confirmed &amp; Cleared</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">
                  This student has no pending financial holds.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3.5 p-5 bg-amber-50 border border-amber-200/40 rounded-2xl shadow-sm">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 stroke-[2]" />
              <div>
                <p className="text-xs font-bold text-amber-800">Pending Financial Clearance</p>
                <p className="text-[10px] text-amber-600 font-bold mt-1">
                  Review the assessment below and confirm receipt of payment.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tuition Breakdown */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
              <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />
                Tuition &amp; Fees Assessment
              </h3>
              
              {student.tuitionBreakdown && student.tuitionBreakdown.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  <table className="w-full text-left text-xs divide-y divide-slate-100">
                    <tbody className="divide-y divide-slate-100">
                      {student.tuitionBreakdown.map((item, idx) => (
                        <tr key={idx} className="bg-white">
                          <td className="px-4 py-3.5 text-slate-600 font-semibold">{item.label}</td>
                          <td className="px-4 py-3.5 text-right text-univ-navy font-bold">
                            {formatPeso(item.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/60 font-bold border-t border-slate-200">
                        <td className="px-4 py-4 text-univ-navy font-extrabold uppercase tracking-widest text-[10px]">Total Tuition Due</td>
                        <td className="px-4 py-4 text-right text-univ-navy font-extrabold text-sm">
                          {formatPeso(student.totalTuition)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No tuition assessment available.</p>
              )}
            </div>

            {/* Action Section */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-premium">
                <h3 className="text-xs font-bold text-univ-navy uppercase tracking-wider mb-4">Settlement Details</h3>
                
                <div className="space-y-5">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Payment Method</p>
                    <p className="text-sm font-extrabold text-univ-navy mt-1 capitalize">{student.paymentMethod || '—'}</p>
                  </div>
                  
                  {isPending && (
                    <div className="pt-4 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">Accounting Action</p>
                      <button
                        onClick={handleConfirmPayment}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Confirm Payment Receipt
                      </button>
                      <p className="text-[10px] text-slate-400 mt-3 text-center">
                        Confirming payment will automatically clear the student for final registration.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
