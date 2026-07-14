import React, { useState, useEffect } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { useConfirm } from '../../../context/ConfirmationContext';
import { PAYMENT_METHODS } from '../../../data/mockData';
import { Banknote, Building2, CreditCard, Smartphone, ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2, Clock, X, User, Hash, Calendar, ShieldCheck, MapPin } from 'lucide-react';
import FloatingInput from '../../../components/FloatingInput';

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

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [formValues, setFormValues] = useState({
    cardholderName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    bankAccountName: '',
    bankName: '',
    bankRef: '',
    gcashName: '',
    gcashNumber: '',
    gcashRef: '',
    cashDepositor: '',
    cashBranch: '',
    cashRef: '',
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const errs = {};
    const nameRegex = /^[A-Za-z\s]{3,50}$/;

    if (selectedMethodId === 'card') {
      if (!formValues.cardholderName.trim()) {
        errs.cardholderName = 'Cardholder name is required.';
      } else if (!nameRegex.test(formValues.cardholderName.trim())) {
        errs.cardholderName = 'Please enter a valid cardholder name (letters only, min 3 characters).';
      }

      const cleanCard = formValues.cardNumber.replace(/\s+/g, '');
      if (!cleanCard) {
        errs.cardNumber = 'Card number is required.';
      } else if (!/^\d{16}$/.test(cleanCard)) {
        errs.cardNumber = 'Card number must be exactly 16 digits.';
      }

      if (!formValues.cardExpiry.trim()) {
        errs.cardExpiry = 'Expiration date is required.';
      } else {
        const match = formValues.cardExpiry.trim().match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/);
        if (!match) {
          errs.cardExpiry = 'Expiration format must be MM/YY.';
        } else {
          const month = parseInt(match[1], 10);
          const year = parseInt('20' + match[2], 10);
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();
          if (year < currentYear || (year === currentYear && month < currentMonth)) {
            errs.cardExpiry = 'This card has expired.';
          }
        }
      }

      if (!formValues.cardCvv.trim()) {
        errs.cardCvv = 'CVV is required.';
      } else if (!/^\d{3}$/.test(formValues.cardCvv.trim())) {
        errs.cardCvv = 'CVV must be exactly 3 digits.';
      }
    }

    else if (selectedMethodId === 'bank') {
      if (!formValues.bankAccountName.trim()) {
        errs.bankAccountName = 'Account name is required.';
      } else if (!nameRegex.test(formValues.bankAccountName.trim())) {
        errs.bankAccountName = 'Please enter a valid account name (letters only, min 3 characters).';
      }

      if (!formValues.bankName) {
        errs.bankName = 'Please select your bank.';
      }

      if (!formValues.bankRef.trim()) {
        errs.bankRef = 'Transaction reference number is required.';
      } else if (!/^[A-Za-z0-9]{10}$/.test(formValues.bankRef.trim())) {
        errs.bankRef = 'Reference number must be exactly 10 alphanumeric characters.';
      }
    }

    else if (selectedMethodId === 'gcash') {
      if (!formValues.gcashName.trim()) {
        errs.gcashName = 'GCash account name is required.';
      } else if (!nameRegex.test(formValues.gcashName.trim())) {
        errs.gcashName = 'Please enter a valid account name (letters only, min 3 characters).';
      }

      if (!formValues.gcashNumber.trim()) {
        errs.gcashNumber = 'GCash mobile number is required.';
      } else if (!/^09\d{9}$/.test(formValues.gcashNumber.trim())) {
        errs.gcashNumber = 'Please enter a valid 11-digit PH mobile number starting with 09.';
      }

      if (!formValues.gcashRef.trim()) {
        errs.gcashRef = 'GCash reference number is required.';
      } else if (!/^\d{10}$|^\d{13}$/.test(formValues.gcashRef.trim())) {
        errs.gcashRef = 'GCash reference number must be exactly 10 or 13 digits.';
      }
    }

    else if (selectedMethodId === 'cash') {
      if (!formValues.cashDepositor.trim()) {
        errs.cashDepositor = 'Depositor name is required.';
      } else if (!nameRegex.test(formValues.cashDepositor.trim())) {
        errs.cashDepositor = 'Please enter a valid depositor name (letters only, min 3 characters).';
      }

      if (!formValues.cashBranch.trim()) {
        errs.cashBranch = 'Branch name is required.';
      } else if (formValues.cashBranch.trim().length < 3) {
        errs.cashBranch = 'Branch name must be at least 3 characters.';
      }

      if (!formValues.cashRef.trim()) {
        errs.cashRef = 'Receipt reference number is required.';
      } else if (!/^\d{6}$/.test(formValues.cashRef.trim())) {
        errs.cashRef = 'Receipt reference number must be exactly 6 digits.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProcessPayment = () => {
    setErrors({});
    setShowValidationModal(true);
  };

  const handleValidationSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setShowValidationModal(false);
    setIsProcessing(true);
    
    setTimeout(() => {
      setIsProcessing(false);
      const success = true;
      dispatch({ type: 'PROCESS_PAYMENT', payload: { success } });
    }, 1500);
  };

  const renderValidationFields = () => {
    switch (selectedMethodId) {
      case 'card':
        return (
          <div className="space-y-4">
            <FloatingInput
              label="Cardholder Name"
              id="cardholderName"
              icon={User}
              value={formValues.cardholderName}
              onChange={(e) => setFormValues({ ...formValues, cardholderName: e.target.value })}
              error={errors.cardholderName}
              placeholder="Name on card"
            />
            <FloatingInput
              label="Card Number"
              id="cardNumber"
              icon={CreditCard}
              value={formValues.cardNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').match(/.{1,4}/g)?.join(' ') || '';
                setFormValues({ ...formValues, cardNumber: val });
              }}
              error={errors.cardNumber}
              placeholder="1111 2222 3333 4444"
              maxLength="19"
            />
            <div className="grid grid-cols-2 gap-4">
              <FloatingInput
                label="Expiration Date (MM/YY)"
                id="cardExpiry"
                icon={Calendar}
                value={formValues.cardExpiry}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 2) {
                    val = val.substring(0, 2) + '/' + val.substring(2, 4);
                  }
                  setFormValues({ ...formValues, cardExpiry: val });
                }}
                error={errors.cardExpiry}
                placeholder="MM/YY"
                maxLength="5"
              />
              <FloatingInput
                label="CVV / CVN"
                id="cardCvv"
                type="password"
                icon={ShieldCheck}
                value={formValues.cardCvv}
                onChange={(e) => setFormValues({ ...formValues, cardCvv: e.target.value.replace(/\D/g, '') })}
                error={errors.cardCvv}
                placeholder="123"
                maxLength="3"
              />
            </div>
          </div>
        );
      case 'bank':
        return (
          <div className="space-y-4">
            <FloatingInput
              label="Sender Account Name"
              id="bankAccountName"
              icon={User}
              value={formValues.bankAccountName}
              onChange={(e) => setFormValues({ ...formValues, bankAccountName: e.target.value })}
              error={errors.bankAccountName}
              placeholder="Account Name"
            />
            <div>
              <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-2">Bank Name</label>
              <select
                value={formValues.bankName}
                onChange={(e) => setFormValues({ ...formValues, bankName: e.target.value })}
                className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.bankName ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-univ-blue/50'
                }`}
              >
                <option value="">Select Bank</option>
                <option value="BDO">BDO Unibank</option>
                <option value="BPI">Bank of the Philippine Islands (BPI)</option>
                <option value="Metrobank">Metrobank</option>
                <option value="Landbank">Landbank of the Philippines</option>
                <option value="SecurityBank">Security Bank</option>
              </select>
              {errors.bankName && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{errors.bankName}</p>}
            </div>
            <FloatingInput
              label="Transaction Reference Number"
              id="bankRef"
              icon={Hash}
              value={formValues.bankRef}
              onChange={(e) => setFormValues({ ...formValues, bankRef: e.target.value })}
              error={errors.bankRef}
              placeholder="10-digit Reference Code"
              maxLength="10"
            />
          </div>
        );
      case 'gcash':
        return (
          <div className="space-y-4">
            <FloatingInput
              label="GCash Account Name"
              id="gcashName"
              icon={User}
              value={formValues.gcashName}
              onChange={(e) => setFormValues({ ...formValues, gcashName: e.target.value })}
              error={errors.gcashName}
              placeholder="Account Name"
            />
            <FloatingInput
              label="GCash Registered Number"
              id="gcashNumber"
              icon={Smartphone}
              value={formValues.gcashNumber}
              onChange={(e) => setFormValues({ ...formValues, gcashNumber: e.target.value.replace(/\D/g, '') })}
              error={errors.gcashNumber}
              placeholder="09171234567"
              maxLength="11"
            />
            <FloatingInput
              label="GCash Reference ID"
              id="gcashRef"
              icon={Hash}
              value={formValues.gcashRef}
              onChange={(e) => setFormValues({ ...formValues, gcashRef: e.target.value.replace(/\D/g, '') })}
              error={errors.gcashRef}
              placeholder="10 or 13 digit number"
              maxLength="13"
            />
          </div>
        );
      case 'cash':
        return (
          <div className="space-y-4">
            <FloatingInput
              label="Depositor / Student Name"
              id="cashDepositor"
              icon={User}
              value={formValues.cashDepositor}
              onChange={(e) => setFormValues({ ...formValues, cashDepositor: e.target.value })}
              error={errors.cashDepositor}
              placeholder="Depositor Name"
            />
            <FloatingInput
              label="Payment Branch Location"
              id="cashBranch"
              icon={MapPin}
              value={formValues.cashBranch}
              onChange={(e) => setFormValues({ ...formValues, cashBranch: e.target.value })}
              error={errors.cashBranch}
              placeholder="NCST Main / Bank Branch Name"
            />
            <FloatingInput
              label="Receipt Reference Code"
              id="cashRef"
              icon={Hash}
              value={formValues.cashRef}
              onChange={(e) => setFormValues({ ...formValues, cashRef: e.target.value.replace(/\D/g, '') })}
              error={errors.cashRef}
              placeholder="6-digit receipt number"
              maxLength="6"
            />
          </div>
        );
      default:
        return null;
    }
  };

  // If already paid or processing in state, skip manual trigger and allow proceeding
  const isPaid = ['paid', 'processing'].includes(paymentStatus) || ['payment_confirmed', 'validation_pending', 'enrolled'].includes(student?.status);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-premium">
        <h2 className="text-2xl font-heading font-extrabold text-univ-navy mb-1.5">Tuition Assessment &amp; Payment</h2>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
          Review your assessed tuition fees and authorize your payment to proceed with enrollment verification.
        </p>

        {/* 1. Tuition Ledger Breakdown */}
        <div className="border border-slate-200/80 rounded-xl overflow-hidden mb-8 shadow-sm">
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase tracking-widest">
            Assessment Ledger Breakdown
          </div>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100 bg-white">
              {student?.tuitionBreakdown && student.tuitionBreakdown.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 text-slate-600 font-medium">{item.label}</td>
                  <td className="px-5 py-4 text-right font-mono font-bold text-univ-navy">
                    ₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/80 border-t border-slate-200 font-extrabold">
                <td className="px-5 py-5 text-xs text-slate-500 uppercase tracking-wider">Total Assessed Tuition &amp; Fees</td>
                <td className="px-5 py-5 text-right font-mono text-univ-navy text-xl">
                  ₱{student?.totalTuition ? student.totalTuition.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 2. Payment Method Selector */}
        <div className="mb-8">
          <h3 className="text-sm font-extrabold text-univ-navy uppercase tracking-wider mb-4">Select Payment Method</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PAYMENT_METHODS.map((method) => {
              const IconComp = iconMap[method.icon] || Banknote;
              const isSelected = selectedMethodId === method.id;

              return (
                <div
                  key={method.id}
                  onClick={() => handleSelectMethod(method.id)}
                  className={`border rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 shadow-sm ${
                    isPaid ? 'opacity-50 cursor-not-allowed' : 'hover:border-univ-blue/30 hover:shadow-md'
                  } ${
                    isSelected
                      ? 'border-univ-blue bg-univ-blue/[0.02] ring-2 ring-univ-blue/20'
                      : 'border-slate-100 bg-white'
                  }`}
                >
                  <IconComp className={`h-8 w-8 mb-3 transition-colors ${isSelected ? 'text-univ-blue' : 'text-slate-400'}`} />
                  <span className={`text-xs font-extrabold uppercase tracking-wide transition-colors ${isSelected ? 'text-univ-navy' : 'text-slate-500'}`}>
                    {method.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Transaction Feedback Banners */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-6 mb-4 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-univ-blue" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verifying transaction details... Please wait.</span>
          </div>
        )}

        {paymentStatus === 'processing' && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/50 rounded-xl p-5 mb-4 shadow-sm">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">Payment Verification Pending</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                Your payment of ₱{student?.totalTuition?.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been submitted. The Office of the Accounting department is currently reviewing and verifying your transaction.
              </p>
            </div>
          </div>
        )}

        {(paymentStatus === 'paid' || ['payment_confirmed', 'validation_pending', 'enrolled'].includes(student?.status)) && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200/50 rounded-xl p-5 mb-4 shadow-sm">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">Payment Verified</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                Your payment of ₱{student?.totalTuition?.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been verified and cleared by the Accounting department.
              </p>
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && !isProcessing && (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200/50 rounded-xl p-5 mb-4 shadow-sm">
            <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-extrabold text-rose-700 uppercase tracking-wider">Transaction Declined</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">
                The transaction could not be authorized. Please try again or select a different payment channel.
              </p>
            </div>
          </div>
        )}

        {/* Action Button for Process Payment */}
        {!isPaid && !isProcessing && (
          <div className="flex justify-end mt-6">
            <button
              onClick={handleProcessPayment}
              disabled={!selectedMethodId}
              className={`px-8 py-3 text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer ${
                selectedMethodId
                  ? 'bg-univ-blue text-white hover:bg-blue-700 shadow-univ-blue/20 hover:shadow-lg hover:-translate-y-0.5'
                  : 'bg-slate-300 opacity-50 cursor-not-allowed'
              }`}
            >
              {paymentStatus === 'failed' ? 'Retry Payment' : 'Proceed with Payment'}
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center mt-8 border-t border-slate-100 pt-6">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-extrabold text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <button
          onClick={onNext}
          disabled={!isPaid}
          className={`px-8 py-3 rounded-xl text-xs font-extrabold text-white transition-all shadow-md cursor-pointer ${
            isPaid
              ? 'bg-univ-blue hover:bg-blue-700 shadow-univ-blue/20 hover:shadow-lg hover:-translate-y-0.5'
              : 'bg-slate-300 opacity-50 cursor-not-allowed'
          }`}
        >
          Proceed to Verification
        </button>
      </div>

      {/* Secure Payment Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-premium-lg max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[9px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded uppercase tracking-wider">Secure Payment</span>
                <h3 className="text-sm font-extrabold text-univ-navy">Enter Payment Details</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowValidationModal(false);
                  setErrors({});
                }} 
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleValidationSubmit}>
              <div className="p-6 overflow-y-auto max-h-[450px]">
                <p className="text-[11px] text-slate-500 mb-6 leading-relaxed font-medium">
                  Please enter your payment authorization details below. All fields are checked according to secure transaction standards.
                </p>
                {renderValidationFields()}
              </div>
              
              <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowValidationModal(false);
                    setErrors({});
                  }}
                  className="px-6 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 text-xs font-extrabold text-white bg-univ-blue hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-univ-blue/20 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Authorize Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
