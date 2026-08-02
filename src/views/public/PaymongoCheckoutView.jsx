import React, { useState, useEffect } from 'react';
import { CreditCard, Smartphone, ShieldCheck, ArrowLeft, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PaymongoCheckoutView() {
  const [sessionId] = useState(() => {
    return new URLSearchParams(window.location.search).get('session_id') || '';
  });

  const [sessionData, setSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
  const [selectedMethod, setSelectedMethod] = useState('gcash'); // 'gcash', 'card', 'paymaya'
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    phone: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    mobileNumber: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isPaying, setIsPaying] = useState(false);
  const [simulateSuccess, setSimulateSuccess] = useState(true);
  const [paymentStatusMessage, setPaymentStatusMessage] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Checkout session ID is missing.');
      setIsLoading(false);
      return;
    }

    async function fetchSession() {
      try {
        const response = await fetch(`/api/paymongo/v1/checkout_sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error('Checkout session not found or expired.');
        }
        const data = await response.json();
        const attr = data.data.attributes;
        setSessionData(attr);

        // Pre-fill form from billing info
        setFormValues((prev) => ({
          ...prev,
          name: attr.billing?.name || '',
          email: attr.billing?.email || '',
          phone: attr.billing?.phone || '',
          mobileNumber: attr.billing?.phone || '',
        }));

        if (attr.status === 'paid') {
          // Already paid
          setPaymentStatusMessage('This session is already paid.');
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load checkout session.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSession();
  }, [sessionId]);

  const validateForm = () => {
    const errs = {};
    if (!formValues.name.trim()) errs.name = 'Full name is required';
    if (!formValues.email.trim() || !/\S+@\S+\.\S+/.test(formValues.email)) errs.email = 'Valid email is required';

    if (selectedMethod === 'card') {
      const cleanCard = formValues.cardNumber.replace(/\s+/g, '');
      if (!cleanCard) errs.cardNumber = 'Card number is required';
      else if (!/^\d{16}$/.test(cleanCard)) errs.cardNumber = 'Must be 16 digits';

      if (!formValues.cardExpiry.trim()) errs.cardExpiry = 'Required';
      else if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(formValues.cardExpiry)) errs.cardExpiry = 'MM/YY format';

      if (!formValues.cardCvv.trim()) errs.cardCvv = 'Required';
      else if (!/^\d{3}$/.test(formValues.cardCvv)) errs.cardCvv = '3 digits';
    } else {
      // GCash or Maya mobile validation
      const cleanPhone = formValues.mobileNumber.replace(/\D/g, '');
      if (!cleanPhone) errs.mobileNumber = 'Mobile number is required';
      else if (!/^09\d{9}$|^639\d{9}$/.test(cleanPhone)) errs.mobileNumber = 'Invalid PH mobile format';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsPaying(true);
    setPaymentStatusMessage(null);

    // Simulate short bank network processing delay
    setTimeout(async () => {
      try {
        const payload = {
          paymentMethod: selectedMethod,
          billingInfo: {
            name: formValues.name,
            email: formValues.email,
            phone: selectedMethod === 'card' ? formValues.phone : formValues.mobileNumber,
          },
          success: simulateSuccess,
          referenceCode: `pay_pm_${Math.floor(10000000 + Math.random() * 90000000)}`,
        };

        const response = await fetch(`/api/paymongo/v1/checkout_sessions/${sessionId}/pay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.errors?.[0]?.detail || 'Simulated payment failed.');
        }

        if (simulateSuccess) {
          // Success redirection
          const redirectUrl = sessionData.success_url.replace('{CHECKOUT_SESSION_ID}', sessionId);
          window.location.href = redirectUrl;
        } else {
          setPaymentStatusMessage('Your payment transaction was declined by the bank. Please try again.');
          setIsPaying(false);
        }
      } catch (err) {
        console.error(err);
        setPaymentStatusMessage(err.message || 'Payment simulation failed.');
        setIsPaying(false);
      }
    }, 1500);
  };

  const formatCardNumber = (value) => {
    return value.replace(/\D/g, '').match(/.{1,4}/g)?.join(' ') || '';
  };

  const formatCardExpiry = (value) => {
    let clean = value.replace(/\D/g, '');
    if (clean.length > 2) {
      return `${clean.substring(0, 2)}/${clean.substring(2, 4)}`;
    }
    return clean;
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f4f6fb]">
        <Loader2 className="w-12 h-12 text-[#3b82f6] animate-spin mb-4" />
        <p className="text-slate-500 font-bold tracking-wide animate-pulse">CONNECTING SECURE GATEWAY...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f4f6fb] p-6 text-center">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 shadow-xl">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">Checkout Error</h2>
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

  const totalAmount = sessionData?.line_items?.reduce((acc, item) => acc + item.amount * (item.quantity || 1), 0) / 100 || 0;

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f8fafc] text-slate-700 font-sans">
      {/* LEFT: Checkout Summary Sidebar */}
      <div className="w-full lg:w-[420px] bg-[#0d1e3d] text-white p-8 lg:p-12 flex flex-col justify-between shrink-0 shadow-lg relative overflow-hidden">
        {/* Decorative Grid Pattern */}
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="relative z-10">
          {/* Merchant Brand */}
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 backdrop-blur-sm">
              <img src="/logo.png" alt="NCST Logo" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-widest text-[#faab1a] uppercase">Merchant assessment</span>
              <h2 className="text-sm font-extrabold tracking-wide uppercase leading-tight text-white">NCST Enrollment</h2>
            </div>
          </div>

          {/* Amount Due Display */}
          <div className="mb-8">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">Amount Due</span>
            <div className="text-4xl font-extrabold font-mono text-white flex items-baseline">
              ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-xs font-medium text-slate-300 ml-1">PHP</span>
            </div>
          </div>

          {/* Assessment details breakdown */}
          <div className="border-t border-b border-white/10 py-6 mb-8 space-y-4">
            <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase block mb-1">Item Details</span>
            {sessionData?.line_items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-200">{item.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Quantity: {item.quantity || 1}</p>
                </div>
                <p className="text-xs font-bold font-mono text-slate-200">
                  ₱{((item.amount * (item.quantity || 1)) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>

          {/* Billing Info Preview */}
          <div className="space-y-3">
            <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase block">Billing Info</span>
            <div>
              <p className="text-[10px] text-slate-400">Payer Name</p>
              <p className="text-xs font-semibold text-slate-200">{sessionData?.billing?.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Email Address</p>
              <p className="text-xs font-semibold text-slate-200">{sessionData?.billing?.email}</p>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="relative z-10 mt-12 lg:mt-0 pt-6 border-t border-white/10 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px] text-slate-400 font-semibold tracking-wide">
            SIMULATED PAYMONGO CHECKOUT GATEWAY
          </span>
        </div>
      </div>

      {/* RIGHT: Payment Method Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-24 relative overflow-y-auto">
        {/* Back Link */}
        <button
          onClick={() => (window.location.href = sessionData.cancel_url)}
          className="absolute top-8 left-8 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors bg-white px-3.5 py-2 rounded-xl shadow-sm border border-slate-200/50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Cancel and Return
        </button>

        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/60 shadow-xl p-8 relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-[#3b82f6]" />
            <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wider">Select Payment Channel</h3>
          </div>

          {/* Simulated Mode Warning Banner */}
          <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 mb-6 flex gap-3 text-amber-800 text-xs font-medium leading-relaxed">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              This is a <strong className="font-extrabold">Simulated Checkout Sandbox</strong>. No real credit card or cash transactions will be processed.
            </div>
          </div>

          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { id: 'gcash', label: 'GCash', icon: Smartphone },
              { id: 'card', label: 'Card', icon: CreditCard },
              { id: 'paymaya', label: 'Maya', icon: Smartphone },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isSelected = selectedMethod === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(tab.id);
                    setFormErrors({});
                    setPaymentStatusMessage(null);
                  }}
                  className={`py-3.5 border rounded-2xl flex flex-col items-center gap-1.5 transition-all cursor-pointer font-bold ${
                    isSelected
                      ? 'border-[#3b82f6] bg-[#3b82f6]/[0.02] ring-2 ring-[#3b82f6]/10 text-[#3b82f6]'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-500'
                  }`}
                >
                  <IconComp className="w-5 h-5" />
                  <span className="text-[10px] uppercase tracking-wider">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handlePay} className="space-y-4">
            {/* Common Fields */}
            <div>
              <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Billing Name</label>
              <input
                type="text"
                placeholder="Juan Dela Cruz"
                value={formValues.name}
                onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                className={`w-full px-4 py-3 text-xs border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:border-transparent ${
                  formErrors.name ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-[#3b82f6]/20'
                }`}
              />
              {formErrors.name && <p className="text-rose-500 text-[10px] font-semibold mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Email Address</label>
              <input
                type="email"
                placeholder="juan@example.com"
                value={formValues.email}
                onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
                className={`w-full px-4 py-3 text-xs border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:border-transparent ${
                  formErrors.email ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-[#3b82f6]/20'
                }`}
              />
              {formErrors.email && <p className="text-rose-500 text-[10px] font-semibold mt-1">{formErrors.email}</p>}
            </div>

            {/* Conditional fields based on selection */}
            {selectedMethod === 'card' ? (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Card Number</label>
                  <input
                    type="text"
                    maxLength="19"
                    placeholder="4111 2222 3333 4444"
                    value={formValues.cardNumber}
                    onChange={(e) => setFormValues({ ...formValues, cardNumber: formatCardNumber(e.target.value) })}
                    className={`w-full px-4 py-3 text-xs border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:border-transparent font-mono ${
                      formErrors.cardNumber ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-[#3b82f6]/20'
                    }`}
                  />
                  {formErrors.cardNumber && <p className="text-rose-500 text-[10px] font-semibold mt-1">{formErrors.cardNumber}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">Expiration (MM/YY)</label>
                    <input
                      type="text"
                      maxLength="5"
                      placeholder="12/28"
                      value={formValues.cardExpiry}
                      onChange={(e) => setFormValues({ ...formValues, cardExpiry: formatCardExpiry(e.target.value) })}
                      className={`w-full px-4 py-3 text-xs border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:border-transparent font-mono ${
                        formErrors.cardExpiry ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-[#3b82f6]/20'
                      }`}
                    />
                    {formErrors.cardExpiry && <p className="text-rose-500 text-[10px] font-semibold mt-1">{formErrors.cardExpiry}</p>}
                  </div>
                  <div>
                    <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">CVV / CVN</label>
                    <input
                      type="password"
                      maxLength="3"
                      placeholder="•••"
                      value={formValues.cardCvv}
                      onChange={(e) => setFormValues({ ...formValues, cardCvv: e.target.value.replace(/\D/g, '') })}
                      className={`w-full px-4 py-3 text-xs border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:border-transparent font-mono ${
                        formErrors.cardCvv ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-[#3b82f6]/20'
                      }`}
                    />
                    {formErrors.cardCvv && <p className="text-rose-500 text-[10px] font-semibold mt-1">{formErrors.cardCvv}</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                  {selectedMethod === 'gcash' ? 'GCash Mobile Number' : 'Maya Registered Number'}
                </label>
                <input
                  type="text"
                  maxLength="11"
                  placeholder="09171234567"
                  value={formValues.mobileNumber}
                  onChange={(e) => setFormValues({ ...formValues, mobileNumber: e.target.value.replace(/\D/g, '') })}
                  className={`w-full px-4 py-3 text-xs border rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:border-transparent font-mono ${
                    formErrors.mobileNumber ? 'border-rose-300 focus:ring-rose-100' : 'border-slate-200 focus:ring-[#3b82f6]/20'
                  }`}
                />
                {formErrors.mobileNumber && <p className="text-rose-500 text-[10px] font-semibold mt-1">{formErrors.mobileNumber}</p>}
              </div>
            )}

            {/* Sandbox Controls Container */}
            <div className="mt-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
              <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase block">Sandbox controls</span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Simulate Payment Success</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulateSuccess}
                    onChange={(e) => setSimulateSuccess(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-rose-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                Toggle to test how the system handles payment failures vs successful instant clearance.
              </p>
            </div>

            {/* Banners */}
            {paymentStatusMessage && (
              <div className={`p-4 rounded-xl text-xs font-semibold flex gap-2.5 border ${
                paymentStatusMessage.includes('declined') || paymentStatusMessage.includes('failed')
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {paymentStatusMessage.includes('declined') || paymentStatusMessage.includes('failed') ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                )}
                <span>{paymentStatusMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPaying || sessionData.status === 'paid'}
              className={`w-full py-4 text-xs font-extrabold tracking-widest uppercase rounded-2xl transition-all shadow-md mt-6 cursor-pointer flex items-center justify-center gap-2 ${
                sessionData.status === 'paid'
                  ? 'bg-emerald-500 text-white cursor-not-allowed'
                  : 'bg-[#3b82f6] text-white hover:bg-blue-600 shadow-blue-500/10 hover:shadow-lg'
              }`}
            >
              {isPaying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Processing payment...
                </>
              ) : sessionData.status === 'paid' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Already Settled
                </>
              ) : (
                `Authorize ₱${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
