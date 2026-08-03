import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { PAYMENT_METHODS } from '../../../data/mockData';
import { Banknote, Building2, CreditCard, Smartphone, CheckCircle, XCircle, Loader2, Clock, X, User, Hash, Calendar, ShieldCheck, MapPin } from 'lucide-react';
import FloatingInput from '../../../components/FloatingInput';

export default function PaymentStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const student = getActiveStudent();

  const selectedMethodId = student?.paymentMethod;
  const paymentStatus = student?.paymentStatus || 'unpaid';
  const downpaymentAmount = Math.min(3000, Number(student?.totalTuition) || 0);
  const canUseDownpayment = (Number(student?.totalTuition) || 0) > downpaymentAmount;

  const [isProcessing, setIsProcessing] = useState(false);

  // Icon mapping
  const iconMap = {
    Banknote: Banknote,
    Building2: Building2,
    CreditCard: CreditCard,
    Smartphone: Smartphone,
  };

  const [paymentMode, setPaymentMode] = useState(() => {
    return ['gcash', 'card'].includes(student?.paymentMethod) ? 'online' : 'manual';
  });
  const [paymentPlan, setPaymentPlan] = useState(() => student?.paymentPlan || 'full');
  const paymentAmount = paymentPlan === 'downpayment' && canUseDownpayment
    ? downpaymentAmount
    : Number(student?.totalTuition) || 0;
  const remainingBalance = Math.max(0, (Number(student?.totalTuition) || 0) - paymentAmount);

  const handleSelectMethod = (methodId) => {
    if (paymentStatus === 'paid') return;
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: { method: methodId } });
    if (['gcash', 'card'].includes(methodId)) {
      setPaymentMode('online');
    } else {
      setPaymentMode('manual');
    }
  };

  const handleOnlinePayment = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/students/${student.id}/paymongo-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentPlan }),
      });
      if (!response.ok) {
        let errText = 'Failed to initiate checkout';
        try {
          const errData = await response.json();
          errText = errData.error || errData.message || errText;
        } catch {}
        throw new Error(errText);
      }
      const data = await response.json();
      if (data && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL returned from server.');
      }
    } catch (error) {
      console.error('Error initiating PayMongo payment:', error);
      toast.error(error.message || 'Failed to initiate online payment.');
    } finally {
      setIsProcessing(false);
    }
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
      let paymentReference = '';
      if (selectedMethodId === 'bank') paymentReference = formValues.bankRef;
      else if (selectedMethodId === 'gcash') paymentReference = formValues.gcashRef;
      else if (selectedMethodId === 'cash') paymentReference = formValues.cashRef;
      
      dispatch({ 
        type: 'PROCESS_PAYMENT', 
        payload: { 
          success, 
          paymentMethod: selectedMethodId, 
          paymentDetails: formValues, 
          paymentReference,
          paymentPlan,
        } 
      });
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
                label="Expiration Date"
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
  const isPaid = ['paid', 'partial', 'processing'].includes(paymentStatus) || ['payment_confirmed', 'validation_pending', 'enrolled'].includes(student?.status);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200/60 rounded-3xl p-8 shadow-premium">
        <h2 className="mb-1.5 text-xl font-semibold text-univ-navy">Tuition and payment</h2>
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

        {/* 2. Payment Plan */}
        {!isPaid && (
          <div className="mb-8">
            <h3 className="text-sm font-extrabold text-univ-navy uppercase tracking-wider mb-4">Payment Plan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button type="button" onClick={() => setPaymentPlan('full')}
                className={`text-left border rounded-xl p-4 transition-all ${paymentPlan === 'full' ? 'border-univ-blue bg-univ-blue/[0.02] ring-2 ring-univ-blue/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                <span className="block text-xs font-extrabold text-univ-navy">Full Payment</span>
                <span className="block mt-1 text-sm font-bold text-univ-blue">₱{(Number(student?.totalTuition) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </button>
              {canUseDownpayment && (
                <button type="button" onClick={() => setPaymentPlan('downpayment')}
                  className={`text-left border rounded-xl p-4 transition-all ${paymentPlan === 'downpayment' ? 'border-univ-blue bg-univ-blue/[0.02] ring-2 ring-univ-blue/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <span className="block text-xs font-extrabold text-univ-navy">Downpayment</span>
                  <span className="block mt-1 text-sm font-bold text-univ-blue">₱3,000.00</span>
                  <span className="block mt-1 text-[10px] font-medium text-slate-500">Remaining balance: ₱{remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. Payment Method Selector */}
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

        {/* Payment Mode (Online vs Manual) Selector */}
        {!isPaid && ['card', 'gcash'].includes(selectedMethodId) && (
          <fieldset className="mb-8 animate-in fade-in duration-300">
            <legend className="mb-3 text-sm font-semibold text-univ-navy">Payment method</legend>
            <div className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <label className={`flex cursor-pointer items-start gap-3 p-4 transition-colors ${paymentMode === 'online' ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="payment-mode"
                  checked={paymentMode === 'online'}
                  onChange={() => setPaymentMode('online')}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-univ-blue"
                />
                <span>
                  <span className="block text-xs font-semibold text-univ-navy">Pay online with PayMongo</span>
                  <span className="mt-1 block text-[11px] font-medium leading-relaxed text-slate-500">
                    Pay with GCash or card. Confirmation is instant.
                  </span>
                </span>
              </label>

              <label className={`flex cursor-pointer items-start gap-3 p-4 transition-colors ${paymentMode === 'manual' ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="payment-mode"
                  checked={paymentMode === 'manual'}
                  onChange={() => setPaymentMode('manual')}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-univ-blue"
                />
                <span>
                  <span className="block text-xs font-semibold text-univ-navy">Manual receipt review</span>
                  <span className="mt-1 block text-[11px] font-medium leading-relaxed text-slate-500">
                    Upload a deposit or GCash receipt. Review takes 1–2 business days.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
        )}

        {/* 3. Transaction Feedback Banners */}
        {isProcessing && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <Loader2 className="h-4 w-4 animate-spin text-univ-blue" />
            <span className="text-xs font-medium text-slate-600">Verifying transaction details. Please wait.</span>
          </div>
        )}

        {paymentStatus === 'processing' && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <h4 className="text-xs font-semibold text-amber-700">Payment verification pending</h4>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                Your payment of ₱{paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} was submitted. Accounting is reviewing the transaction.
              </p>
            </div>
          </div>
        )}

        {(paymentStatus === 'paid' || paymentStatus === 'partial' || ['payment_confirmed', 'validation_pending', 'enrolled'].includes(student?.status)) && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <h4 className="text-xs font-semibold text-emerald-700">Payment verified</h4>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                ₱{(student?.amountPaid || paymentAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} received.{(student?.remainingBalance || remainingBalance) > 0 ? ` Remaining balance: ₱${(student?.remainingBalance || remainingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}.` : ' Tuition is fully settled.'}
              </p>
            </div>
          </div>
        )}

        {paymentStatus === 'failed' && !isProcessing && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <h4 className="text-xs font-semibold text-rose-700">Transaction declined</h4>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                The transaction could not be authorized. Please try again or select a different payment channel.
              </p>
            </div>
          </div>
        )}

        {/* Action Button for Process Payment */}
        {!isPaid && !isProcessing && (
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={paymentMode === 'online' ? handleOnlinePayment : handleProcessPayment}
              disabled={!selectedMethodId}
              className={`px-4 py-3 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                selectedMethodId
                  ? 'bg-univ-blue text-white hover:bg-blue-700'
                  : 'bg-slate-300 opacity-50 cursor-not-allowed'
              }`}
            >
              {paymentStatus === 'failed' ? 'Retry payment' : `Pay ₱${paymentAmount.toLocaleString()}`}
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center mt-8 border-t border-slate-100 pt-6">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="min-w-24 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          Back
        </button>

        <button
          onClick={onNext}
          disabled={!isPaid}
          className={`min-w-24 rounded-lg px-4 py-3 text-xs font-bold text-white transition-colors cursor-pointer ${
            isPaid
              ? 'bg-univ-blue hover:bg-blue-700'
              : 'bg-slate-300 opacity-50 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>

      {/* Secure Payment Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-premium-lg max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="relative flex items-center justify-center border-b border-slate-100 bg-slate-50 p-6">
              <h3 className="text-center text-sm font-extrabold text-univ-navy">Enter Payment Details</h3>
              <button 
                type="button"
                onClick={() => {
                  setShowValidationModal(false);
                  setErrors({});
                }} 
                className="absolute right-6 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
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
                  className="min-w-24 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-w-24 rounded-lg bg-univ-blue px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 cursor-pointer"
                >
                  Pay ₱{paymentAmount.toLocaleString()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
