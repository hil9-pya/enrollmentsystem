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
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-premium">
      <h1 className="text-xl font-extrabold text-univ-navy">Select Enrollment Type</h1>
      <p className="text-xs text-slate-500 mt-1 mb-8 leading-relaxed font-medium">
        Please select the category that matches your current enrollment status at NCST.
      </p>
 
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {ENROLLMENT_TYPES.filter(et => et.id !== 'continuing').map((et) => {
          const Icon = iconMap[et.icon];
          const isSelected = selectedType === et.id;
 
          return (
            <button
              key={et.id}
              type="button"
              onClick={() => handleSelect(et.id)}
              className={`border p-6 rounded-2xl text-left cursor-pointer transition-all duration-300 flex flex-col justify-between h-48 ${
                isSelected
                  ? 'border-univ-indigo bg-univ-indigo/[0.02] ring-4 ring-univ-indigo/5 text-univ-navy shadow-premium'
                  : 'border-slate-200 bg-white hover:border-univ-indigo hover:shadow-premium-lg hover:-translate-y-0.5'
              }`}
            >
              <div>
                {Icon && (
                  <div className={`p-2.5 rounded-xl inline-flex items-center justify-center mb-4 transition-colors ${
                    isSelected ? 'bg-univ-indigo text-white' : 'bg-slate-50 text-slate-500'
                  }`}>
                    <Icon className="h-6 w-6 stroke-[2]" />
                  </div>
                )}
                <p className="text-sm font-extrabold text-univ-navy">{et.label}</p>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">{et.description}</p>
              </div>
            </button>
          );
        })}
      </div>
 
      <div className="flex justify-end mt-8 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={onNext}
          disabled={!selectedType}
          className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
            selectedType
              ? 'bg-univ-indigo hover:bg-univ-blue'
              : 'bg-slate-300 opacity-50 cursor-not-allowed'
          }`}
        >
          Continue Enrollment
        </button>
      </div>
    </div>
  );
}
