import React, { useEffect, useRef, useState } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import FloatingInput from '../../../components/FloatingInput';
import { User, Mail, Phone, Calendar, MapPin, Lock, School, BookOpen, ArrowRightLeft, Hash, AlertCircle, CheckCircle, ChevronDown, ShieldCheck, Loader2 } from 'lucide-react';
import { authFetch } from '../../../utils/authFetch.js';

const MIN_OTP_VERIFY_LOADING_MS = 700;

// Strips characters commonly used in injection attacks before sending to backend.
// Since we use MongoDB (not SQL), this guards against NoSQL operator injection.
const sanitizeInput = (value, maxLen = 300) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[$<>]/g, '').slice(0, maxLen);
};

const capitalizeFirstLetter = (value) => {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const TRANSFER_REASONS = [
  { value: '', label: 'Select a reason' },
  { value: 'financial', label: 'Financial Reasons' },
  { value: 'relocation', label: 'Relocation / Change of Residence' },
  { value: 'academic_program', label: 'Better Academic Program / Curriculum' },
  { value: 'personal', label: 'Personal / Family Reasons' },
  { value: 'scholarship', label: 'Scholarship Opportunity' },
  { value: 'school_closure', label: 'Previous School Closure / Merging' },
  { value: 'career_shift', label: 'Career Shift / Change of Course' },
  { value: 'other', label: 'Other Reasons' },
];

const YEAR_LEVELS = [
  { value: '', label: 'Select year level' },
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
  { value: '5', label: '5th Year' },
];

function getInitialDraft(student) {
  return {
    firstName: student?.firstName || '',
    lastName: student?.lastName || '',
    email: student?.email || '',
    phone: student?.phone || '',
    birthDate: student?.birthDate || '',
    address: student?.address || '',
    previousSchool: student?.previousSchool || '',
    previousProgram: student?.previousProgram || '',
    yearLevelAtTransfer: student?.yearLevelAtTransfer || '',
    unitsEarned: student?.unitsEarned || '',
    reasonForTransfer: student?.reasonForTransfer || '',
  };
}

function buildPersistPayload(draft, isTransferee) {
  const payload = {
    firstName: draft.firstName,
    lastName: draft.lastName,
    email: draft.email,
    phone: draft.phone,
    birthDate: draft.birthDate,
    address: draft.address,
  };

  if (isTransferee) {
    payload.previousSchool = draft.previousSchool;
    payload.previousProgram = draft.previousProgram;
    payload.yearLevelAtTransfer = draft.yearLevelAtTransfer;
    payload.unitsEarned = draft.unitsEarned;
    payload.reasonForTransfer = draft.reasonForTransfer;
  }

  return payload;
}

function SelectField({ label, id, icon: Icon, value, onChange, options, error, required }) {
  const errorId = `${id}-error`;
  return (
    <div className="mb-5 w-full">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${error ? 'text-rose-500' : 'text-slate-400'}`} aria-hidden="true" />
        )}
        <select
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full appearance-none rounded-lg border py-2.5 pr-8 text-sm font-medium outline-none transition-colors duration-150 cursor-pointer ${Icon ? 'pl-9' : 'pl-3'}
            ${error
              ? 'border-rose-400 bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
              : 'border-slate-200 bg-white hover:border-slate-300 focus:border-univ-blue focus:ring-2 focus:ring-univ-blue/15'
            }
          `}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.value === ''}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && (
        <div id={errorId} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default function RegistrationStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const student = getActiveStudent();
  const enrollmentType = student?.enrollmentType || 'new';
  const isTransferee = enrollmentType === 'transfer';
  const emailLocked = Boolean(student?.status && student.status !== 'registration');

  const [errors, setErrors] = useState({});
  const [draft, setDraft] = useState(() => getInitialDraft(student));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailAvailability, setEmailAvailability] = useState('idle');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [isEmailAction, setIsEmailAction] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const saveTimerRef = useRef(null);
  const dirtyRef = useRef(false);
  const studentRef = useRef(student);
  studentRef.current = student;

  // Polling and autosave replace `student` with a new object. Resetting the
  // draft for every replacement erases text while the applicant is typing.
  useEffect(() => {
    setDraft(getInitialDraft(studentRef.current));
    setErrors({});
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setOtpSent(false);
    setOtpError('');
    setIsVerifyingOtp(false);
    dirtyRef.current = false;
  }, [student?.id]);

  useEffect(() => {
    if (!student?.id || !dirtyRef.current) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      dispatch({
        type: 'UPDATE_ACTIVE_STUDENT',
        payload: buildPersistPayload(draft, isTransferee),
      });
    }, 350);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [draft, dispatch, isTransferee, student?.id]);

  useEffect(() => {
    if (emailLocked) {
      setEmailAvailability('idle');
      return undefined;
    }
    const email = draft.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailability('idle');
      return undefined;
    }

    let cancelled = false;
    setEmailAvailability('checking');
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ email, excludeStudentId: student?.id || '' });
        const res = await fetch(`/api/students/email-availability?${params}`);
        const data = await res.json();
        if (!cancelled) setEmailAvailability(data.available ? 'available' : 'taken');
      } catch {
        if (!cancelled) setEmailAvailability('idle');
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft.email, emailLocked, student?.id]);

  const validate = () => {
    const newErrors = {};
    const today = new Date();

    const nameValidationRegex = /^[a-zA-Z\s.-]+$/;
    const sanitizedFirst = sanitizeInput(draft.firstName.trim() || '', 100);
    const sanitizedLast = sanitizeInput(draft.lastName.trim() || '', 100);

    if (!sanitizedFirst || sanitizedFirst.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters.';
    } else if (!nameValidationRegex.test(sanitizedFirst)) {
      newErrors.firstName = 'First name must contain letters, spaces, hyphens, and dots only.';
    }
    if (!sanitizedLast || sanitizedLast.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters.';
    } else if (!nameValidationRegex.test(sanitizedLast)) {
      newErrors.lastName = 'Last name must contain letters, spaces, hyphens, and dots only.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitizedEmail = sanitizeInput(draft.email.trim() || '', 254);
    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    const phoneRegex = /^09\d{2}[-\s]?\d{3}[-\s]?\d{4}$/;
    const sanitizedPhone = sanitizeInput(draft.phone.trim() || '', 20);
    if (!sanitizedPhone || !phoneRegex.test(sanitizedPhone)) {
      newErrors.phone = 'Please enter a valid PH phone number (e.g., 0917-123-4567).';
    }

    if (!draft.birthDate) {
      newErrors.birthDate = 'Birth date is required.';
    } else {
      const birthDate = new Date(draft.birthDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age < 18) {
        newErrors.birthDate = 'You must be at least 18 years old to enroll.';
      } else if (age > 120) {
        newErrors.birthDate = 'Please enter a valid birth date.';
      }
    }

    const sanitizedAddress = sanitizeInput(draft.address.trim() || '', 500);
    if (!sanitizedAddress || sanitizedAddress.length < 10) {
      newErrors.address = 'Please enter a complete address (min. 10 characters).';
    }

    if (isTransferee) {
      const sanitizedSchool = sanitizeInput(draft.previousSchool.trim() || '', 200);
      if (!sanitizedSchool || sanitizedSchool.length < 3) {
        newErrors.previousSchool = 'Please enter your previous school name.';
      }
      const sanitizedProgram = sanitizeInput(draft.previousProgram.trim() || '', 200);
      if (!sanitizedProgram || sanitizedProgram.length < 2) {
        newErrors.previousProgram = 'Please enter your previous program/course.';
      }
      if (!draft.yearLevelAtTransfer) {
        newErrors.yearLevelAtTransfer = 'Please select your year level at transfer.';
      }
      if (!draft.reasonForTransfer) {
        newErrors.reasonForTransfer = 'Please select your reason for transfer.';
      }
    }

    const hasUppercase = /[A-Z]/.test(password || '');
    const hasNumber = /[0-9]/.test(password || '');
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password || '');
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    } else if (!hasUppercase || !hasNumber || !hasSpecialChar) {
      newErrors.password = 'Password must include at least one uppercase letter, one number, and one special character.';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  function handleChange(field, rawValue, maxLen = 300) {
    const value = sanitizeInput(rawValue, maxLen);
    dirtyRef.current = true;
    setDraft(prev => ({ ...prev, [field]: value }));
    if (field === 'email') {
      setOtpSent(false);
      setOtp('');
      setOtpError('');
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  const flushDraft = async () => {
    if (!student?.id) return;
    await dispatch({
      type: 'UPDATE_ACTIVE_STUDENT',
      payload: buildPersistPayload(draft, isTransferee),
    });
  };

  const requestOtp = async () => {
    setIsEmailAction(true);
    setOtpError('');
    try {
      const response = await authFetch(`/api/students/${student.id}/email-verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: draft.email.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || 'Could not send verification code.');
      if (data.emailVerified) {
        onNext();
        return;
      }
      setOtpSent(true);
    } catch (error) {
      setOtpError(error.message);
    } finally {
      setIsEmailAction(false);
    }
  };

  const handleNext = async () => {
    if (!validate()) return;
    await flushDraft();
    if (password) {
      await dispatch({ type: 'UPDATE_ACTIVE_STUDENT', payload: { applicantPassword: password } });
    }
    await requestOtp();
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setOtpError('Enter the 6-digit code sent to your email.');
      return;
    }
    setIsEmailAction(true);
    setIsVerifyingOtp(true);
    setOtpError('');
    const verificationStartedAt = Date.now();
    const waitForLoadingPaint = async () => {
      const remaining = MIN_OTP_VERIFY_LOADING_MS - (Date.now() - verificationStartedAt);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
    };
    try {
      const response = await authFetch(`/api/students/${student.id}/email-verification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || 'Could not verify email.');
      await waitForLoadingPaint();
      onNext();
    } catch (error) {
      await waitForLoadingPaint();
      setOtpError(error.message);
    } finally {
      setIsEmailAction(false);
      setIsVerifyingOtp(false);
    }
  };

  const todayDate = new Date();
  const maxDate = new Date(todayDate.getFullYear() - 18, todayDate.getMonth(), todayDate.getDate()).toISOString().split('T')[0];
  const minDate = new Date(todayDate.getFullYear() - 120, todayDate.getMonth(), todayDate.getDate()).toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-premium">
      <h1 className="mb-1 text-xl font-semibold text-univ-navy">Student registration</h1>
      <p className="text-sm text-slate-500 mb-8 font-medium">
        Please fill in your correct personal details below.
      </p>

      {isTransferee && (
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mb-6 shadow-sm">
          <ArrowRightLeft className="h-5 w-5 text-slate-900 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Transferee Applicant</p>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed font-medium">
              As a transferee, please provide your complete academic history from your previous institution. This information is required for credit transfer evaluation and proper year-level placement.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">Personal Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatingInput
            label="First Name"
            id="firstName"
            icon={User}
            value={draft.firstName}
            onChange={(e) => handleChange('firstName', capitalizeFirstLetter(e.target.value.replace(/[^a-zA-Z\s.-]/g, '')), 100)}
            error={errors.firstName}
            required
            placeholder="Juan"
          />
          <FloatingInput
            label="Last Name"
            id="lastName"
            icon={User}
            value={draft.lastName}
            onChange={(e) => handleChange('lastName', capitalizeFirstLetter(e.target.value.replace(/[^a-zA-Z\s.-]/g, '')), 100)}
            error={errors.lastName}
            required
            placeholder="Dela Cruz"
          />
        </div>

        <FloatingInput
          label="Email Address"
          id="email"
          type="email"
          icon={Mail}
          value={draft.email}
          onChange={(e) => handleChange('email', e.target.value, 254)}
          error={errors.email || (emailAvailability === 'taken' ? 'This email is already used by another application.' : null)}
          disabled={emailLocked}
          required
          placeholder="juan@email.com"
        />
        {emailLocked && (
          <p className="-mt-4 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            Email is locked after document submission. Contact Admissions to request a change.
          </p>
        )}
        {emailAvailability === 'checking' && (
          <p className="-mt-4 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Checking email availability...</p>
        )}
        {emailAvailability === 'available' && (
          <div className="-mt-4 mb-4 flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
            <CheckCircle className="h-3 w-3" /> Email is available
          </div>
        )}

        <FloatingInput
          label="Phone Number"
          id="phone"
          type="tel"
          icon={Phone}
          value={draft.phone}
          onChange={(e) => handleChange('phone', e.target.value.replace(/[^0-9\-\s+]/g, ''), 20)}
          error={errors.phone}
          required
          placeholder="0917-123-4567"
        />

        <FloatingInput
          label="Birth Date"
          id="birthDate"
          type="date"
          icon={Calendar}
          value={draft.birthDate}
          onChange={(e) => handleChange('birthDate', e.target.value)}
          error={errors.birthDate}
          required
          min={minDate}
          max={maxDate}
        />

        <FloatingInput
          label="Home Address"
          id="address"
          icon={MapPin}
          value={draft.address}
          onChange={(e) => handleChange('address', e.target.value, 500)}
          error={errors.address}
          required
          placeholder="123 Rizal St., Quezon City"
        />

        {isTransferee && (
          <>
            <div className="pt-6 mt-2 border-t border-slate-100">
              <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Previous Academic History</h3>
              <p className="text-[10px] text-slate-400 font-medium mb-4">Required for credit transfer evaluation</p>

              <div className="space-y-4">
                <FloatingInput
                  label="Previous School / University Name"
                  id="previousSchool"
                  icon={School}
                  value={draft.previousSchool}
                  onChange={(e) => handleChange('previousSchool', e.target.value, 200)}
                  error={errors.previousSchool}
                  required
                  placeholder="e.g., University of the Philippines, Diliman"
                />

                <FloatingInput
                  label="Previous Program / Course"
                  id="previousProgram"
                  icon={BookOpen}
                  value={draft.previousProgram}
                  onChange={(e) => handleChange('previousProgram', e.target.value, 200)}
                  error={errors.previousProgram}
                  required
                  placeholder="e.g., Bachelor of Science in Computer Science"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectField
                    label="Year Level at Time of Transfer"
                    id="yearLevelAtTransfer"
                    icon={Hash}
                    value={draft.yearLevelAtTransfer}
                    onChange={(e) => {
                      dirtyRef.current = true;
                      setDraft(prev => ({ ...prev, yearLevelAtTransfer: e.target.value }));
                      if (errors.yearLevelAtTransfer) setErrors(prev => ({ ...prev, yearLevelAtTransfer: undefined }));
                    }}
                    options={YEAR_LEVELS}
                    error={errors.yearLevelAtTransfer}
                    required
                  />

                  <FloatingInput
                    label="Total Units Earned (approx.)"
                    id="unitsEarned"
                    icon={Hash}
                    value={draft.unitsEarned}
                    onChange={(e) => handleChange('unitsEarned', e.target.value.replace(/[^0-9]/g, ''), 3)}
                    error={errors.unitsEarned}
                    placeholder="e.g., 48"
                  />
                </div>

                <SelectField
                  label="Reason for Transfer"
                  id="reasonForTransfer"
                  icon={ArrowRightLeft}
                  value={draft.reasonForTransfer}
                  onChange={(e) => {
                    dirtyRef.current = true;
                    setDraft(prev => ({ ...prev, reasonForTransfer: e.target.value }));
                    if (errors.reasonForTransfer) setErrors(prev => ({ ...prev, reasonForTransfer: undefined }));
                  }}
                  options={TRANSFER_REASONS}
                  error={errors.reasonForTransfer}
                  required
                />
              </div>
            </div>
          </>
        )}

        <div className="pt-6 mt-4 border-t border-slate-100">
          <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-4">Account Security</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FloatingInput
              label="Applicant Password"
              id="password"
              type="password"
              icon={Lock}
              value={password}
              autoComplete="new-password"
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              required
              placeholder="Create a strong password"
            />
            <FloatingInput
              label="Confirm Password"
              id="confirmPassword"
              type="password"
              icon={Lock}
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }));
              }}
              error={errors.confirmPassword}
              required
              placeholder="Re-enter password"
            />
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            Password must be at least 6 characters and include an uppercase letter, a number, and a special character.
          </p>
        </div>
      </div>

      {otpSent && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-univ-blue" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-univ-navy">Verify your email</p>
              <p id="email-verification-help" className="mt-1 text-xs leading-relaxed text-slate-600">
                Enter the 6-digit code sent to <strong className="font-semibold text-slate-700">{draft.email}</strong>. Code expires in 10 minutes.
              </p>

              <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:w-56">
                  <label htmlFor="email-verification-code" className="mb-1.5 block text-xs font-medium text-slate-700">
                    Verification code
                  </label>
                  <input
                    id="email-verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    disabled={isVerifyingOtp}
                    aria-invalid={Boolean(otpError)}
                    aria-describedby={otpError ? 'email-verification-help email-verification-error' : 'email-verification-help'}
                    onChange={(event) => {
                      setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                      setOtpError('');
                    }}
                    placeholder="000000"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center font-mono text-lg font-semibold tracking-[0.3em] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-univ-blue focus:ring-2 focus:ring-univ-blue/15 disabled:cursor-wait disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={requestOtp}
                  disabled={isEmailAction}
                  className="rounded-md px-1 py-2.5 text-xs font-semibold text-univ-blue transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {isEmailAction && !isVerifyingOtp ? 'Sending code…' : 'Resend code'}
                </button>
              </div>

              {otpError && (
                <p id="email-verification-error" className="mt-2 text-xs font-semibold text-rose-600">
                  {otpError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!otpSent && otpError && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{otpError}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-8 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={isEmailAction}
          className="min-w-24 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400 cursor-pointer"
        >
          Back
        </button>
        <button
          type="button"
          onClick={otpSent ? handleVerifyOtp : handleNext}
          disabled={isEmailAction}
          className="inline-flex min-w-40 items-center justify-center gap-2 rounded-lg bg-univ-blue px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:bg-slate-400 cursor-pointer"
        >
          {isEmailAction ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isVerifyingOtp ? 'Verifying code…' : 'Sending code…'}
            </>
          ) : otpSent ? 'Verify and continue' : 'Send verification code'}
        </button>
      </div>
    </div>
  );
}
