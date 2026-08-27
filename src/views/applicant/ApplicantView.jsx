import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { AlertCircle, Wrench } from 'lucide-react';
import StepIndicator from '../../components/StepIndicator';
import EnrollmentTypeStep from '../student/steps/EnrollmentTypeStep';
import ProgramSelectionStep from '../student/steps/ProgramSelectionStep';
import RegistrationStep from '../student/steps/RegistrationStep';
import DocumentUploadStep from '../student/steps/DocumentUploadStep';
import AcceptanceLetterStep from './steps/AcceptanceLetterStep';
import PortalShell from '../../components/PortalShell';

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
    student.address?.trim() &&
    student.emailVerified
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
  if (!student.firstName || !student.lastName || !student.email || !student.emailVerified) return 'registration';

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

    const studentChanged = lastInitializedStudentId.current !== student.id;

    setCompletedSteps((prev) => {
      const computed = getCompletedStepsFromApplicant(student);
      const stored = JSON.parse(localStorage.getItem(`applicant_completed_steps_${student.id}`) || '[]');
      const baseSteps = studentChanged ? [] : prev;
      return Array.from(new Set([...baseSteps, ...computed, ...stored]));
    });

    const resumeStep = getResumeStepFromApplicant(student);
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
  const currentStepDefinition = APPLICANT_STEPS.find((step) => step.key === effectiveStep);
  const currentStepNumber = APPLICANT_STEPS.findIndex((step) => step.key === effectiveStep) + 1;

  if (settings?.systemMaintenance) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div>
              <h1 className="text-sm font-semibold text-univ-navy">System maintenance</h1>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                The Admissions Portal is undergoing scheduled maintenance. Please check back later.
              </p>
            </div>
          </div>
          <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
            <button onClick={() => { setActiveStudent(null); window.location.href = '/'; }} className="rounded-lg bg-univ-navy px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-slate-800 cursor-pointer">
              Return home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sidebar = (
      <aside className="flex w-68 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="p-5 flex flex-1 items-center overflow-y-auto">
          <StepIndicator
            currentStep={effectiveStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
            steps={APPLICANT_STEPS}
            allCompleted={student && getStatusRank(student.status) >= 2}
          />
        </div>

        {hasStudentInfo && (
          <div className="border-t border-slate-200 bg-white p-4">
            <div className="px-1">
              <p className="text-sm font-semibold text-univ-navy leading-none">
                {student.firstName} {student.lastName}
              </p>
              <p className="mt-1.5 font-mono text-xs text-slate-500">{student.id}</p>
            </div>
            <button
              onClick={() => {
                setActiveStudent(null);
                window.location.href = '/';
              }}
              className="mt-3 w-full rounded-lg border border-slate-200 py-1.5 text-center text-xs font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
            >
              Exit portal
            </button>
          </div>
        )}
      </aside>
  );

  return (
    <PortalShell
      sidebar={sidebar}
      portalTitle="Applicant Portal"
      mobileTitle={currentStepDefinition?.label || 'Application Progress'}
      mobileSubtitle={`Step ${currentStepNumber} of ${APPLICANT_STEPS.length}`}
    >
      <main className="h-full min-w-0 overflow-y-auto bg-slate-50/70">
        <div className="max-w-4xl mx-auto p-4 sm:p-5 lg:p-8">
          {settings?.announcement && (
            <div className="mb-6 p-4 bg-amber-50 rounded-xl flex items-start gap-3 border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 stroke-[2]" />
              <p className="text-sm text-amber-900 font-bold leading-relaxed whitespace-pre-wrap">
                {settings.announcement}
              </p>
            </div>
          )}
          <div key={effectiveStep} className="ui-content-enter">
            {renderStep()}
          </div>
        </div>
      </main>
    </PortalShell>
  );
}
