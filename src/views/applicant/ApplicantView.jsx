import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { AlertCircle, Wrench } from 'lucide-react';
import StepIndicator from '../../components/StepIndicator';
import ApplicantPortalAccess from './ApplicantPortalAccess';
import EnrollmentTypeStep from '../student/steps/EnrollmentTypeStep';
import ProgramSelectionStep from '../student/steps/ProgramSelectionStep';
import RegistrationStep from '../student/steps/RegistrationStep';
import DocumentUploadStep from '../student/steps/DocumentUploadStep';
import AcceptanceLetterStep from './steps/AcceptanceLetterStep';

export const APPLICANT_STEPS = [
  { key: 'type', label: 'Enrollment Type' },
  { key: 'program', label: 'Program Selection' },
  { key: 'registration', label: 'Application Form' },
  { key: 'documents', label: 'Submit Documents' },
  { key: 'acceptance', label: 'Acceptance Letter' },
];

const STEP_KEYS = APPLICANT_STEPS.map((s) => s.key);

const STATUS_RANK = {
  registration: 0,
  documents_submitted: 1,
  documents_rejected: 1,
  documents_approved: 2,
};

function getStatusRank(status) {
  if (!status) return 0;
  return STATUS_RANK[status] ?? 3; // anything > documents_approved is beyond applicant phase
}


function getCompletedStepsFromApplicant(student) {
  if (!student) return [];

  const status = student.status || 'registration';
  const rank = getStatusRank(status);
  const completed = [];

  if (student.enrollmentType) completed.push('type');
  if (student.programId) completed.push('program');
  if (
    student.firstName?.trim() &&
    student.lastName?.trim() &&
    student.email?.trim() &&
    student.phone?.trim() &&
    student.birthDate &&
    student.address?.trim()
  ) {
    completed.push('registration');
  }
  if (rank >= 1) completed.push('documents');
  if (rank >= 2) completed.push('acceptance');

  return completed;
}

function getResumeStepFromApplicant(student) {
  if (!student) return 'type';

  const status = student.status || 'registration';

  if (!student.enrollmentType) return 'type';
  if (!student.programId) return 'program';
  if (!student.firstName || !student.lastName || !student.email) return 'registration';

  switch (status) {
    case 'documents_rejected':
      return 'documents';
    case 'documents_submitted':
      return 'acceptance';
    case 'documents_approved':
    default:
      if (getStatusRank(status) >= 2) return 'acceptance';
      if (student.documents?.length > 0) return 'documents';
      return 'registration';
  }
}

function getFurthestStep(storedStep, resumeStep) {
  const storedIndex = STEP_KEYS.indexOf(storedStep);
  const resumeIndex = STEP_KEYS.indexOf(resumeStep);

  if (storedIndex < 0) return resumeStep;
  if (resumeIndex < 0) return storedStep;
  return STEP_KEYS[Math.min(storedIndex, resumeIndex)];
}

export default function ApplicantView() {
  const { getActiveStudent, setActiveStudent, settings } = useEnrollment();
  const student = getActiveStudent();

  const [currentStep, setCurrentStep] = useState('type');
  const [completedSteps, setCompletedSteps] = useState([]);
  const lastInitializedStudentId = useRef(null);
  const lastKnownStatus = useRef(null);

  // Initialize resume state on applicant switch
  useEffect(() => {
    if (!student?.id) return;

    setCompletedSteps(getCompletedStepsFromApplicant(student));

    const resumeStep = getResumeStepFromApplicant(student);
    const studentChanged = lastInitializedStudentId.current !== student.id;
    const statusChanged = lastKnownStatus.current !== student.status;

    if (studentChanged) {
      const storedStep = localStorage.getItem(`applicant_current_step_${student.id}`);
      const shouldUseStatusStep = student.status && student.status !== 'registration';
      setCurrentStep(
        shouldUseStatusStep
          ? resumeStep
          : storedStep
          ? getFurthestStep(storedStep, resumeStep)
          : resumeStep
      );
      lastInitializedStudentId.current = student.id;
      lastKnownStatus.current = student.status;
      return;
    }

    if (statusChanged) {
      setCurrentStep((prevStep) => getFurthestStep(prevStep, resumeStep));
      lastKnownStatus.current = student.status;
    }
  }, [student]);

  useEffect(() => {
    if (!student?.id) return;
    localStorage.setItem(`applicant_current_step_${student.id}`, currentStep);
  }, [currentStep, student?.id]);

  useEffect(() => {
    if (!student?.id) return;
    localStorage.setItem(`applicant_completed_steps_${student.id}`, JSON.stringify(completedSteps));
  }, [completedSteps, student?.id]);

  const onNext = useCallback(() => {
    const idx = STEP_KEYS.indexOf(currentStep);
    if (idx < 0 || idx >= STEP_KEYS.length - 1) return;

    const status = student?.status || 'registration';
    const rank = getStatusRank(status);

    if (currentStep === 'documents' && rank < 1) return;

    setCompletedSteps((prev) =>
      prev.includes(currentStep) ? prev : [...prev, currentStep]
    );
    setCurrentStep(STEP_KEYS[idx + 1]);
  }, [currentStep, student]);

  const onBack = useCallback(() => {
    const idx = STEP_KEYS.indexOf(currentStep);
    if (idx <= 0) return;
    setCurrentStep(STEP_KEYS[idx - 1]);
  }, [currentStep]);

  const effectiveStep = currentStep;

  const handleStepClick = useCallback((stepKey) => {
    const targetIndex = STEP_KEYS.indexOf(stepKey);
    const activeIndex = STEP_KEYS.indexOf(effectiveStep);
    const isCompleted = completedSteps.includes(stepKey);

    if (targetIndex < 0) return;
    if (!isCompleted && targetIndex > activeIndex) return;

    setCurrentStep(stepKey);
  }, [completedSteps, effectiveStep]);

  const renderStep = () => {
    switch (effectiveStep) {
      case 'type':
        return <EnrollmentTypeStep onNext={onNext} />;
      case 'program':
        return <ProgramSelectionStep onNext={onNext} onBack={onBack} />;
      case 'registration':
        return <RegistrationStep onNext={onNext} onBack={onBack} />;
      case 'documents':
        return <DocumentUploadStep onNext={onNext} onBack={onBack} />;
      case 'acceptance':
        return <AcceptanceLetterStep />;
      default:
        return <EnrollmentTypeStep onNext={onNext} />;
    }
  };

  const hasStudentInfo = student && student.firstName && student.lastName;

  if (settings?.systemMaintenance) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-slate-200/60 p-10 shadow-premium max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-univ-navy mb-3">System Maintenance</h1>
          <p className="text-sm text-slate-500 leading-relaxed font-medium mb-8">
            The Admissions Portal is currently undergoing scheduled maintenance. Please check back later.
          </p>
          <button onClick={() => { setActiveStudent(null); window.location.href = '/'; }} className="px-6 py-2.5 bg-univ-navy text-white text-xs font-bold rounded-xl shadow-md cursor-pointer hover:bg-slate-800 transition-all">
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-50">
      <aside className="w-68 shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col items-center gap-2 bg-slate-50/50">
          <img src="/logo.png" alt="NCST Logo" className="h-12 w-auto object-contain drop-shadow-sm" />
          <h2 className="text-[10px] font-extrabold text-univ-navy uppercase tracking-widest text-center leading-relaxed">
            National College of<br />Science &amp; Technology
          </h2>
          <span className="text-[9px] font-bold text-univ-gold uppercase tracking-wider">Applicant Gateway</span>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <StepIndicator
            currentStep={effectiveStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
            steps={APPLICANT_STEPS}
            allCompleted={student && getStatusRank(student.status) >= 2}
          />
        </div>

        {hasStudentInfo && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/30">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-premium">
              <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider inline-block ${
                getStatusRank(student?.status) >= 2
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/40'
                  : 'bg-univ-blue/10 text-univ-blue border border-univ-blue/20'
              }`}>{getStatusRank(student?.status) >= 2 ? '✓ Approved Applicant' : 'Active Applicant'}</span>
              <p className="text-xs font-bold text-univ-navy mt-2 leading-none">
                {student.firstName} {student.lastName}
              </p>
              <p className="font-mono text-[9px] text-slate-400 mt-1.5">{student.id}</p>
            </div>
            <button
              onClick={() => {
                setActiveStudent(null);
                window.location.href = '/';
              }}
              className="mt-3 w-full py-2 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-[10px] font-bold text-slate-500 hover:text-rose-600 transition-all rounded-lg text-center cursor-pointer uppercase tracking-wider"
            >
              Exit Portal
            </button>
          </div>
        )}
      </aside>
 
      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="max-w-4xl mx-auto p-8">
          {settings?.announcement && (
            <div className="mb-6 p-4 bg-amber-50 rounded-xl flex items-start gap-3 border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 stroke-[2]" />
              <p className="text-sm text-amber-900 font-bold leading-relaxed whitespace-pre-wrap">
                {settings.announcement}
              </p>
            </div>
          )}
          {renderStep()}
        </div>
      </main>
    </div>
  );
}
