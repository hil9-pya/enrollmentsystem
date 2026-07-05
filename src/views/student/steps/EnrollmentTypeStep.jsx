import React from 'react';
import { useEnrollment } from '../../../context/EnrollmentContext';
import { ENROLLMENT_TYPES } from '../../../data/mockData';
import { UserPlus, UserCheck, ArrowRightLeft, GraduationCap } from 'lucide-react';

const iconMap = {
  UserPlus,
  UserCheck,
  ArrowRightLeft,
  GraduationCap,
};

export default function EnrollmentTypeStep({ onNext }) {
  const { getActiveStudent, dispatch } = useEnrollment();
  const student = getActiveStudent();
  const selectedType = student?.enrollmentType || null;

  function handleSelect(typeId) {
    dispatch({ type: 'SET_ENROLLMENT_TYPE', payload: { enrollmentType: typeId } });
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Select Enrollment Type</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">
        Choose the enrollment category that applies to you.
      </p>

      <div className="grid grid-cols-2 gap-6">
        {ENROLLMENT_TYPES.map((et) => {
          const Icon = iconMap[et.icon];
          const isSelected = selectedType === et.id;

          return (
            <button
              key={et.id}
              type="button"
              onClick={() => handleSelect(et.id)}
              className={`bg-white border rounded-md p-6 text-left cursor-pointer transition-colors duration-150 ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-100'
                  : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              {Icon && (
                <Icon
                  className={`h-8 w-8 mb-3 transition-colors duration-150 ${
                    isSelected ? 'text-indigo-600' : 'text-slate-500'
                  }`}
                />
              )}
              <p className="text-base font-semibold text-slate-900">{et.label}</p>
              <p className="text-sm text-slate-500 mt-1">{et.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end mt-6">
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedType}
          className={`px-6 py-2.5 rounded-md text-sm font-medium text-white transition-colors duration-150 ${
            selectedType
              ? 'bg-indigo-600 hover:bg-indigo-700'
              : 'bg-indigo-600 opacity-50 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
