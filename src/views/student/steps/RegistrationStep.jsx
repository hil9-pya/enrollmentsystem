import React, { useState } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import FloatingInput from '../../../components/FloatingInput';
import { User, Mail, Phone, Calendar, MapPin, Lock, School, BookOpen, ArrowRightLeft, Hash, AlertCircle, ChevronDown } from 'lucide-react';

// Strips characters commonly used in injection attacks before sending to backend.
// Since we use MongoDB (not SQL), this guards against NoSQL operator injection.
const sanitizeInput = (value, maxLen = 300) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[\$<>]/g, '').slice(0, maxLen);
};

const TRANSFER_REASONS = [
  { value: '', label: '— Select a reason —' },
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
  { value: '', label: '— Select year level —' },
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
  { value: '5', label: '5th Year' },
];

function SelectField({ label, id, icon: Icon, value, onChange, options, error, required }) {
  return (
    <div className="relative mb-6 w-full">
      <div className="relative">
        {Icon && (
          <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300 ${error ? 'text-rose-400' : 'text-slate-400'}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <select
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full pl-11 pr-8 pt-5 pb-2 rounded-xl text-sm font-medium transition-all duration-300 outline-none appearance-none cursor-pointer
            ${error
              ? 'bg-rose-50/50 border border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
              : 'bg-slate-50 border border-slate-200 focus:bg-white focus:border-univ-blue focus:ring-4 focus:ring-univ-blue/10 hover:border-slate-300'
            }
          `}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.value === ''}>{opt.label}</option>
          ))}
        </select>
        <label
          htmlFor={id}
          className={`absolute text-xs font-extrabold uppercase tracking-widest -translate-y-3 scale-75 transition-all duration-300 top-4 left-11 origin-[0] z-10 ${error ? 'text-rose-500' : 'text-slate-500'}`}
        >
          {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && (
        <div className="flex items-center gap-1 mt-1.5 animate-in slide-in-from-top-1">
          <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">{error}</span>
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

  const [errors, setErrors] = useState({});
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validate = () => {
    const newErrors = {};
    const today = new Date();

    const nameValidationRegex = /^[a-zA-Z\s\-\.]+$/;
    const sanitizedFirst = sanitizeInput(student?.firstName?.trim() || '', 100);
    const sanitizedLast = sanitizeInput(student?.lastName?.trim() || '', 100);

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
    const sanitizedEmail = sanitizeInput(student?.email?.trim() || '', 254);
    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    const phoneRegex = /^09\d{2}[-\s]?\d{3}[-\s]?\d{4}$/;
    const sanitizedPhone = sanitizeInput(student?.phone?.trim() || '', 20);
    if (!sanitizedPhone || !phoneRegex.test(sanitizedPhone)) {
      newErrors.phone = 'Please enter a valid PH phone number (e.g., 0917-123-4567).';
    }

    if (!student?.birthDate) {
      newErrors.birthDate = 'Birth date is required.';
    } else {
      const birthDate = new Date(student.birthDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age < 18) {
        newErrors.birthDate = 'You must be at least 18 years old to enroll.';
      } else if (age > 120) {
        newErrors.birthDate = 'Please enter a valid birth date.';
      }
    }

    const sanitizedAddress = sanitizeInput(student?.address?.trim() || '', 500);
    if (!sanitizedAddress || sanitizedAddress.length < 10) {
      newErrors.address = 'Please enter a complete address (min. 10 characters).';
    }

    // Transferee-specific validations
    if (isTransferee) {
      const sanitizedSchool = sanitizeInput(student?.previousSchool?.trim() || '', 200);
      if (!sanitizedSchool || sanitizedSchool.length < 3) {
        newErrors.previousSchool = 'Please enter your previous school name.';
      }
      const sanitizedProgram = sanitizeInput(student?.previousProgram?.trim() || '', 200);
      if (!sanitizedProgram || sanitizedProgram.length < 2) {
        newErrors.previousProgram = 'Please enter your previous program/course.';
      }
      if (!student?.yearLevelAtTransfer) {
        newErrors.yearLevelAtTransfer = 'Please select your year level at transfer.';
      }
      if (!student?.reasonForTransfer) {
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
    dispatch({ type: 'UPDATE_ACTIVE_STUDENT', payload: { [field]: value } });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  const handleNext = () => {
    if (validate()) {
      if (password) {
        dispatch({ type: 'UPDATE_ACTIVE_STUDENT', payload: { applicantPassword: password } });
      }
      onNext();
    }
  };

  const todayDate = new Date();
  const maxDate = new Date(todayDate.getFullYear() - 18, todayDate.getMonth(), todayDate.getDate()).toISOString().split('T')[0];
  const minDate = new Date(todayDate.getFullYear() - 120, todayDate.getMonth(), todayDate.getDate()).toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-premium">
      <h1 className="text-2xl font-heading font-extrabold text-univ-navy mb-1">Student Registration</h1>
      <p className="text-sm text-slate-500 mb-8 font-medium">
        Please fill in your correct personal details below. Fields marked with an asterisk (*) are mandatory.
      </p>

      {/* Transferee notice */}
      {isTransferee && (
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mb-6 shadow-sm">
          <ArrowRightLeft className="h-5 w-5 text-slate-900 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Transferee Applicant</p>
            <p className="text-xs text-slate-700 mt-1 leading-relaxed font-medium">
              As a transferee, please provide your complete academic history from your previous institution. This information is required for credit transfer evaluation and proper year-level placement.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {/* Personal Info Section */}
        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Personal Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatingInput
            label="First Name"
            id="firstName"
            icon={User}
            value={student?.firstName || ''}
            onChange={(e) => handleChange('firstName', e.target.value.replace(/[^a-zA-Z\s\-\.]/g, ''), 100)}
            error={errors.firstName}
            required
            placeholder="Juan"
          />
          <FloatingInput
            label="Last Name"
            id="lastName"
            icon={User}
            value={student?.lastName || ''}
            onChange={(e) => handleChange('lastName', e.target.value.replace(/[^a-zA-Z\s\-\.]/g, ''), 100)}
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
          value={student?.email || ''}
          onChange={(e) => handleChange('email', e.target.value, 254)}
          error={errors.email}
          required
          placeholder="juan@email.com"
        />

        <FloatingInput
          label="Phone Number"
          id="phone"
          type="tel"
          icon={Phone}
          value={student?.phone || ''}
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
          value={student?.birthDate || ''}
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
          value={student?.address || ''}
          onChange={(e) => handleChange('address', e.target.value, 500)}
          error={errors.address}
          required
          placeholder="123 Rizal St., Quezon City"
        />

        {/* Transferee Academic History Section */}
        {isTransferee && (
          <>
            <div className="pt-6 mt-2 border-t border-slate-100">
              <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Previous Academic History</h3>
              <p className="text-[10px] text-slate-400 font-medium mb-4">Required for credit transfer evaluation</p>

              <div className="space-y-4">
                <FloatingInput
                  label="Previous School / University Name"
                  id="previousSchool"
                  icon={School}
                  value={student?.previousSchool || ''}
                  onChange={(e) => handleChange('previousSchool', e.target.value, 200)}
                  error={errors.previousSchool}
                  required
                  placeholder="e.g., University of the Philippines, Diliman"
                />

                <FloatingInput
                  label="Previous Program / Course"
                  id="previousProgram"
                  icon={BookOpen}
                  value={student?.previousProgram || ''}
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
                    value={student?.yearLevelAtTransfer || ''}
                    onChange={(e) => {
                      dispatch({ type: 'UPDATE_ACTIVE_STUDENT', payload: { yearLevelAtTransfer: e.target.value } });
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
                    value={student?.unitsEarned || ''}
                    onChange={(e) => handleChange('unitsEarned', e.target.value.replace(/[^0-9]/g, ''), 3)}
                    error={errors.unitsEarned}
                    placeholder="e.g., 48"
                  />
                </div>

                <SelectField
                  label="Reason for Transfer"
                  id="reasonForTransfer"
                  icon={ArrowRightLeft}
                  value={student?.reasonForTransfer || ''}
                  onChange={(e) => {
                    dispatch({ type: 'UPDATE_ACTIVE_STUDENT', payload: { reasonForTransfer: e.target.value } });
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

        {/* Password Section */}
        <div className="pt-6 mt-4 border-t border-slate-100">
          <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Account Security</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FloatingInput
              label="Applicant Password"
              id="password"
              type="password"
              icon={Lock}
              value={password}
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

      {/* Actions */}
      <div className="flex items-center justify-between mt-8 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-extrabold text-slate-600 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-8 py-3 rounded-xl text-xs font-extrabold text-white bg-univ-blue hover:bg-blue-700 transition-all shadow-md shadow-univ-blue/20 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
