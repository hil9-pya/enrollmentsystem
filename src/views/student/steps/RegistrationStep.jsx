import React, { useState } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import FloatingInput from '../../../components/FloatingInput';
import { User, Mail, Phone, Calendar, MapPin, Lock } from 'lucide-react';

export default function RegistrationStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const student = getActiveStudent();
  const [errors, setErrors] = useState({});
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validate = () => {
    const newErrors = {};
    const today = new Date();

    const nameValidationRegex = /^[a-zA-Z\s]+$/;
    if (!student?.firstName?.trim() || student.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters.";
    } else if (!nameValidationRegex.test(student.firstName.trim())) {
      newErrors.firstName = "First name must contain letters and spaces only.";
    }
    if (!student?.lastName?.trim() || student.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters.";
    } else if (!nameValidationRegex.test(student.lastName.trim())) {
      newErrors.lastName = "Last name must contain letters and spaces only.";
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!student?.email?.trim() || !emailRegex.test(student.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    // Allows formats like 0917-123-4567, 0917 123 4567, or 09171234567
    const phoneRegex = /^09\d{2}[-\s]?\d{3}[-\s]?\d{4}$/; 
    if (!student?.phone?.trim() || !phoneRegex.test(student.phone)) {
      newErrors.phone = "Please enter a valid PH phone number (e.g., 0917-123-4567).";
    }

    if (!student?.birthDate) {
      newErrors.birthDate = "Birth date is required.";
    } else {
      const birthDate = new Date(student.birthDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) {
        newErrors.birthDate = "You must be at least 18 years old to enroll.";
      }
    }

    if (!student?.address?.trim() || student.address.trim().length < 10) {
      newErrors.address = "Please enter a complete address.";
    }

    const hasUppercase = /[A-Z]/.test(password || '');
    const hasNumber = /[0-9]/.test(password || '');
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(password || '');

    if (!password || password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    } else if (!hasUppercase || !hasNumber || !hasSpecialChar) {
      newErrors.password = "Password must include at least one uppercase letter, one number, and one special character.";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  function handleChange(field, value) {
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

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-premium">
      <h1 className="text-2xl font-heading font-extrabold text-univ-navy mb-2">Student Registration</h1>
      <p className="text-sm text-slate-500 mb-8 font-medium">
        Please fill in your correct personal details below. Fields marked with an asterisk (*) are mandatory.
      </p>

      <div className="space-y-4">
        {/* Name row — 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatingInput
            label="First Name"
            id="firstName"
            icon={User}
            value={student?.firstName || ''}
            onChange={(e) => handleChange('firstName', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
            error={errors.firstName}
            required
            placeholder="Juan"
          />
          <FloatingInput
            label="Last Name"
            id="lastName"
            icon={User}
            value={student?.lastName || ''}
            onChange={(e) => handleChange('lastName', e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
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
          onChange={(e) => handleChange('email', e.target.value)}
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
          onChange={(e) => handleChange('phone', e.target.value.replace(/[^0-9-\s]/g, ''))}
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
        />

        <FloatingInput
          label="Home Address"
          id="address"
          icon={MapPin}
          value={student?.address || ''}
          onChange={(e) => handleChange('address', e.target.value)}
          error={errors.address}
          required
          placeholder="123 Rizal St., Quezon City"
        />

        {/* Password */}
        <div className="pt-6 mt-4 border-t border-slate-100">
           <h3 className="text-sm font-extrabold text-univ-navy mb-4">Account Security</h3>
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
