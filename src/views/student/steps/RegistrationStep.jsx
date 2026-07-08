import React, { useState } from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';

export default function RegistrationStep({ onNext, onBack }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const student = getActiveStudent();
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    const today = new Date();

    if (!student?.firstName?.trim() || student.firstName.trim().length < 2) {
      newErrors.firstName = "First name must be at least 2 characters.";
    }
    if (!student?.lastName?.trim() || student.lastName.trim().length < 2) {
      newErrors.lastName = "Last name must be at least 2 characters.";
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
      onNext();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-premium">
      <h1 className="text-xl font-extrabold text-univ-navy">Student Registration</h1>
      <p className="text-xs text-slate-500 mt-1 mb-8 leading-relaxed font-medium">
        Please fill in your correct personal details below. Fields marked with an asterisk (*) are mandatory.
      </p>

      <div className="space-y-6">
        {/* Name row — 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
              First Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={student?.firstName || ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white ${errors.firstName ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200'}`}
              placeholder="Juan"
            />
            {errors.firstName && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{errors.firstName}</p>}
          </div>
          <div>
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
              Last Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={student?.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white ${errors.lastName ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200'}`}
              placeholder="Dela Cruz"
            />
            {errors.lastName && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{errors.lastName}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
            Email Address <span className="text-rose-600">*</span>
          </label>
          <input
            type="email"
            value={student?.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white ${errors.email ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200'}`}
            placeholder="juan@email.com"
          />
          {errors.email && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
            Phone Number <span className="text-rose-600">*</span>
          </label>
          <input
            type="tel"
            value={student?.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white ${errors.phone ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200'}`}
            placeholder="0917-123-4567"
          />
          {errors.phone && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{errors.phone}</p>}
        </div>

        {/* Birth Date */}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
            Birth Date <span className="text-rose-600">*</span>
          </label>
          <input
            type="date"
            value={student?.birthDate || ''}
            onChange={(e) => handleChange('birthDate', e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white ${errors.birthDate ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200'}`}
          />
          {errors.birthDate && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{errors.birthDate}</p>}
        </div>

        {/* Address */}
        <div>
          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
            Home Address <span className="text-rose-600">*</span>
          </label>
          <textarea
            rows={3}
            value={student?.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-univ-indigo focus:border-transparent transition-all bg-slate-50/50 focus:bg-white resize-none ${errors.address ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200'}`}
            placeholder="123 Rizal St., Quezon City"
          />
          {errors.address && <p className="text-rose-500 text-xs mt-1.5 font-semibold">{errors.address}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-8 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 rounded-lg transition-all cursor-pointer"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-univ-indigo hover:bg-univ-blue transition-all shadow-sm cursor-pointer"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
