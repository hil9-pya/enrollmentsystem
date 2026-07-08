import React, { useState, useEffect } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { useConfirm } from '../../../context/ConfirmationContext';
import { PAYMENT_METHODS } from '../../../data/mockData';
import { Banknote, Building2, CreditCard, Smartphone, ArrowLeft, ArrowRight, CheckCircle, XCircle, Loader2, Clock, X } from 'lucide-react';

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
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Cardholder Name</label>
              <input
                type="text"
                placeholder="Cardholder Name"
                value={formValues.cardholderName}
                onChange={(e) => setFormValues({ ...formValues, cardholderName: e.target.value })}
                className={`w-full px-3.5 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.cardholderName ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                }`}
              />
              {errors.cardholderName && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.cardholderName}</p>}
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Card Number</label>
              <input
                type="text"
                maxLength="19"
                placeholder="1111 2222 3333 4444"
                value={formValues.cardNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').match(/.{1,4}/g)?.join(' ') || '';
                  setFormValues({ ...formValues, cardNumber: val });
                }}
                className={`w-full px-3.5 py-2.5 text-xs font-mono border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.cardNumber ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                }`}
              />
              {errors.cardNumber && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.cardNumber}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Expiration Date</label>
                <input
                  type="text"
                  maxLength="5"
                  placeholder="MM/YY"
                  value={formValues.cardExpiry}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val.length > 2) {
                      val = val.substring(0, 2) + '/' + val.substring(2, 4);
                    }
                    setFormValues({ ...formValues, cardExpiry: val });
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs font-mono border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                    errors.cardExpiry ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                  }`}
                />
                {errors.cardExpiry && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.cardExpiry}</p>}
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">CVV / CVN</label>
                <input
                  type="password"
                  maxLength="3"
                  placeholder="123"
                  value={formValues.cardCvv}
                  onChange={(e) => setFormValues({ ...formValues, cardCvv: e.target.value.replace(/\D/g, '') })}
                  className={`w-full px-3.5 py-2.5 text-xs font-mono border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                    errors.cardCvv ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                  }`}
                />
                {errors.cardCvv && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.cardCvv}</p>}
              </div>
            </div>
          </div>
        );
      case 'bank':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Sender Account Name</label>
              <input
                type="text"
                placeholder="Account Name"
                value={formValues.bankAccountName}
                onChange={(e) => setFormValues({ ...formValues, bankAccountName: e.target.value })}
                className={`w-full px-3.5 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.bankAccountName ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                }`}
              />
              {errors.bankAccountName && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.bankAccountName}</p>}
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Bank Name</label>
              <select
                value={formValues.bankName}
                onChange={(e) => setFormValues({ ...formValues, bankName: e.target.value })}
                className={`w-full px-3.5 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.bankName ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                }`}
              >
                <option value="">Select Bank</option>
                <option value="BDO">BDO Unibank</option>
                <option value="BPI">Bank of the Philippine Islands (BPI)</option>
                <option value="Metrobank">Metrobank</option>
                <option value="Landbank">Landbank of the Philippines</option>
                <option value="SecurityBank">Security Bank</option>
              </select>
              {errors.bankName && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.bankName}</p>}
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Transaction Reference Number</label>
              <input
                type="text"
                maxLength="10"
                placeholder="10-digit Reference Code"
                value={formValues.bankRef}
                onChange={(e) => setFormValues({ ...formValues, bankRef: e.target.value })}
                className={`w-full px-3.5 py-2.5 text-xs font-mono border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.bankRef ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                }`}
              />
              {errors.bankRef && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.bankRef}</p>}
            </div>
          </div>
        );
      case 'gcash':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">GCash Account Name</label>
              <input
                type="text"
                placeholder="Account Name"
                value={formValues.gcashName}
                onChange={(e) => setFormValues({ ...formValues, gcashName: e.target.value })}
                className={`w-full px-3.5 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.gcashName ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                }`}
              />
              {errors.gcashName && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.gcashName}</p>}
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">GCash Registered Number</label>
              <input
                type="text"
                maxLength="11"
                placeholder="09171234567"
                value={formValues.gcashNumber}
                onChange={(e) => setFormValues({ ...formValues, gcashNumber: e.target.value.replace(/\D/g, '') })}
                className={`w-full px-3.5 py-2.5 text-xs font-mono border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.gcashNumber ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                }`}
              />
              {errors.gcashNumber && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.gcashNumber}</p>}
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">GCash Reference ID</label>
              <input
                type="text"
                maxLength="13"
                placeholder="10 or 13 digit number"
                value={formValues.gcashRef}
                onChange={(e) => setFormValues({ ...formValues, gcashRef: e.target.value.replace(/\D/g, '') })}
                className={`w-full px-3.5 py-2.5 text-xs font-mono border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.gcashRef ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                }`}
              />
              {errors.gcashRef && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.gcashRef}</p>}
            </div>
          </div>
        );
      case 'cash':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Depositor / Student Name</label>
              <input
                type="text"
                placeholder="Depositor Name"
                value={formValues.cashDepositor}
                onChange={(e) => setFormValues({ ...formValues, cashDepositor: e.target.value })}
                className={`w-full px-3.5 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.cashDepositor ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                }`}
              />
              {errors.cashDepositor && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.cashDepositor}</p>}
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Payment Branch Location</label>
              <input
                type="text"
                placeholder="NCST Main / Bank Branch Name"
                value={formValues.cashBranch}
                onChange={(e) => setFormValues({ ...formValues, cashBranch: e.target.value })}
                className={`w-full px-3.5 py-2.5 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.cashBranch ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                }`}
              />
              {errors.cashBranch && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.cashBranch}</p>}
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Receipt Reference Code</label>
              <input
                type="text"
                maxLength="6"
                placeholder="6-digit receipt number"
                value={formValues.cashRef}
                onChange={(e) => setFormValues({ ...formValues, cashRef: e.target.value.replace(/\D/g, '') })}
                className={`w-full px-3.5 py-2.5 text-xs font-mono border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-slate-50/50 ${
                  errors.cashRef ? 'border-rose-200 focus:ring-rose-200/50' : 'border-slate-200 focus:ring-univ-indigo/50'
                }`}
              />
              {errors.cashRef && <p className="text-[10px] text-rose-600 font-bold mt-1">{errors.cashRef}</p>}
            </div>
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
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-premium">
        <h2 className="text-xl font-extrabold text-univ-navy mb-1.5">Tuition Assessment &amp; Payment Portal</h2>
        <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium">
          Review your assessed tuition fees and authorize your payment to proceed with enrollment verification.
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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verifying transaction details... Please wait.</span>
          </div>
        )}

        {paymentStatus === 'processing' && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/50 rounded-xl p-4.5 mb-4">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider">Payment Verification Pending</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Your payment of ₱{student?.totalTuition?.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been submitted. The Office of the Accounting department is currently reviewing and verifying your transaction.
              </p>
            </div>
          </div>
        )}

        {(paymentStatus === 'paid' || ['payment_confirmed', 'validation_pending', 'enrolled'].includes(student?.status)) && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200/50 rounded-xl p-4.5 mb-4">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Payment Verified</h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Your payment of ₱{student?.totalTuition?.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been verified and cleared by the Accounting department.
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
                The transaction could not be authorized. Please try again or select a different payment channel.
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
      {/* Secure Payment Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-premium-lg max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[9px] font-bold bg-univ-indigo/10 text-univ-indigo border border-univ-indigo/20 rounded uppercase tracking-wider">Secure Payment</span>
                <h3 className="text-sm font-extrabold text-univ-navy">Enter Payment Details</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowValidationModal(false);
                  setErrors({});
                }} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            
            <form onSubmit={handleValidationSubmit}>
              <div className="p-6 overflow-y-auto max-h-[450px]">
                <p className="text-[11px] text-slate-500 mb-5 leading-relaxed font-medium">
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
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-150 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-univ-indigo hover:bg-univ-blue rounded-lg transition-all shadow-sm cursor-pointer"
                >
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
