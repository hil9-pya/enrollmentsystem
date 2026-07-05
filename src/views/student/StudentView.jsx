import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useAuth } from '../../context/AuthContext';
import StepIndicator, { STEPS } from '../../components/StepIndicator';
import StudentPortalAccess from './StudentPortalAccess';
import EnrollmentTypeStep from './steps/EnrollmentTypeStep';
import RegistrationStep from './steps/RegistrationStep';
import DocumentUploadStep from './steps/DocumentUploadStep';
import ProgramSelectionStep from './steps/ProgramSelectionStep';
import CourseEvaluationStep from './steps/CourseEvaluationStep';
import SubjectEnrollmentStep from './steps/SubjectEnrollmentStep';
import PaymentStep from './steps/PaymentStep';
import FulfillmentStep from './steps/FulfillmentStep';

const STEP_KEYS = STEPS.map((s) => s.key);

const STATUS_RANK = {
  registration: 0,
  documents_submitted: 1,
  documents_rejected: 1,
  documents_approved: 2,
  advising_pending: 3,
  advising_approved: 4,
  enrollment_pending: 5,
  payment_pending: 6,
  payment_confirmed: 7,
  validation_pending: 8,
  enrolled: 9,
};

function getStatusRank(status) {
  return STATUS_RANK[status] ?? 0;
}

function getCompletedStepsFromStudent(student) {
  if (!student) return [];

  const status = student.status || 'registration';
  const rank = getStatusRank(status);
  const hasSelectedSubjects = student.selectedSubjects?.length > 0;
  const completed = [];

  if (student.enrollmentType) {
    completed.push('type');
  }
  if (student.firstName && student.lastName) {
    completed.push('registration');
  }
  if (rank >= 1) {
    completed.push('documents');
  }
  if (student.programId) {
    completed.push('program');
  }
  if (rank >= 4 || student.adviserNotes || hasSelectedSubjects) {
    completed.push('evaluation');
  }
  if (rank >= 6 || (hasSelectedSubjects && status !== 'advising_pending')) {
    completed.push('enrollment');
  }
  if (rank >= 7) {
    completed.push('payment');
  }

  return completed;
}

function getResumeStepFromStudent(student) {
  if (!student) return 'type';

  const status = student.status || 'registration';
  const hasSelectedSubjects = student.selectedSubjects?.length > 0;

  if (!student.enrollmentType) return 'type';
  if (!student.firstName || !student.lastName || !student.email) return 'registration';

  switch (status) {
    case 'payment_pending':
      return 'payment';
    case 'payment_confirmed':
    case 'validation_pending':
    case 'enrolled':
      return 'fulfillment';
    case 'advising_pending':
      return 'evaluation';
    case 'advising_approved':
    case 'enrollment_pending':
      return 'enrollment';
    case 'documents_submitted':
      if (hasSelectedSubjects) return 'payment';
      return 'documents';
    case 'documents_rejected':
      return 'documents';
    case 'documents_approved':
      return student.programId ? 'evaluation' : 'program';
    default:
      if (hasSelectedSubjects) return 'payment';
      if (student.programId) return 'evaluation';
      if (student.documents?.length > 0) return 'documents';
      return 'registration';
  }
}

function getFurthestStep(storedStep, resumeStep) {
  const storedIndex = STEP_KEYS.indexOf(storedStep);
  const resumeIndex = STEP_KEYS.indexOf(resumeStep);

  if (storedIndex < 0) return resumeStep;
  if (resumeIndex < 0) return storedStep;
  return STEP_KEYS[Math.max(storedIndex, resumeIndex)];
}

export default function StudentView() {
  const { getActiveStudent, setActiveStudent } = useEnrollment();
  const { user } = useAuth();
  const student = getActiveStudent();

  const [currentStep, setCurrentStep] = useState('type');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isVerified, setIsVerified] = useState(() => {
    return user?.role === 'student';
  });
  const lastInitializedStudentId = useRef(null);
  const lastKnownStatus = useRef(null);

  // Sync verification if user logs in/out
  useEffect(() => {
    if (user?.role === 'student') {
      setIsVerified(true);
    }
  }, [user]);

  // Initialize resume state on student switch, then let users navigate manually.
  useEffect(() => {
    if (!student?.id) return;

    setCompletedSteps(getCompletedStepsFromStudent(student));

    const resumeStep = getResumeStepFromStudent(student);
    const studentChanged = lastInitializedStudentId.current !== student.id;
    const statusChanged = lastKnownStatus.current !== student.status;

    if (studentChanged) {
      const storedStep = localStorage.getItem(`student_current_step_${student.id}`);
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

  // Persist currentStep changes
  useEffect(() => {
    if (!student?.id) return;
    localStorage.setItem(`student_current_step_${student.id}`, currentStep);
  }, [currentStep, student?.id]);

  // Persist completedSteps changes
  useEffect(() => {
    if (!student?.id) return;
    localStorage.setItem(`student_completed_steps_${student.id}`, JSON.stringify(completedSteps));
  }, [completedSteps, student?.id]);

  // Auto-advance step if student status rank increases (e.g. from background updates/polling)
  useEffect(() => {
    if (!student) return;
    const status = student.status;
    const rank = getStatusRank(status);

    setCompletedSteps((prev) => {
      let updated = [...prev];
      let changed = false;

      if (student.enrollmentType && !updated.includes('type')) {
        updated.push('type');
        changed = true;
      }
      if (student.firstName && student.lastName && !updated.includes('registration')) {
        updated.push('registration');
        changed = true;
      }
      if (rank >= 1 && !updated.includes('documents')) {
        updated.push('documents');
        changed = true;
      }
      if (student.programId && !updated.includes('program')) {
        updated.push('program');
        changed = true;
      }
      if ((rank >= 4 || student.adviserNotes || student.selectedSubjects?.length > 0) && !updated.includes('evaluation')) {
        updated.push('evaluation');
        changed = true;
      }
      if ((rank >= 6 || (student.selectedSubjects?.length > 0 && status !== 'advising_pending')) && !updated.includes('enrollment')) {
        updated.push('enrollment');
        changed = true;
      }
      if (rank >= 7 && !updated.includes('payment')) {
        updated.push('payment');
        changed = true;
      }

      return changed ? updated : prev;
    });

  }, [student]);

  const onNext = useCallback(() => {
    const idx = STEP_KEYS.indexOf(currentStep);
    if (idx < 0 || idx >= STEP_KEYS.length - 1) return;

    const status = student?.status || 'registration';
    const rank = getStatusRank(status);

    // Block advancing past 'documents' if documents haven't been submitted
    if (currentStep === 'documents' && rank < 1) return;

    // Block advancing past 'program' if documents aren't at least submitted
    if (currentStep === 'program' && rank < 1) return;

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
      case 'registration':
        return <RegistrationStep onNext={onNext} onBack={onBack} />;
      case 'documents':
        return <DocumentUploadStep onNext={onNext} onBack={onBack} />;
      case 'program':
        return <ProgramSelectionStep onNext={onNext} onBack={onBack} />;
      case 'evaluation':
        return <CourseEvaluationStep onNext={onNext} onBack={onBack} />;
      case 'enrollment':
        return <SubjectEnrollmentStep onNext={onNext} onBack={onBack} />;
      case 'payment':
        return <PaymentStep onNext={onNext} onBack={onBack} />;
      case 'fulfillment':
        return <FulfillmentStep />;
      default:
        return <EnrollmentTypeStep onNext={onNext} />;
    }
  };

  const hasStudentInfo = student && student.firstName && student.lastName;

  if (!isVerified) {
    return <StudentPortalAccess onVerified={() => setIsVerified(true)} />;
  }

  return (
    <div className="flex h-full">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-6 border-b border-slate-200 flex flex-col items-center gap-3">
          <img src="/logo.png" alt="NCST Logo" className="h-16 w-auto object-contain" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
            National College of Science & Technology
          </h2>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <StepIndicator
            currentStep={effectiveStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />
        </div>

        {/* ── Student Info Footer ─────────────────────────────── */}
        {hasStudentInfo && (
          <div className="p-6 border-t border-slate-200">
            <p className="font-mono text-xs text-slate-400">{student.id}</p>
            <p className="text-sm font-medium text-slate-900 mt-0.5">
              {student.firstName} {student.lastName}
            </p>
            <button
              onClick={() => {
                setActiveStudent(null);
                setIsVerified(false);
              }}
              className="mt-4 w-full px-3 py-1.5 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors rounded-md text-center cursor-pointer"
            >
              Exit Student Portal
            </button>
          </div>
        )}
      </aside>

      {/* ── Main Content ────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto p-6">{renderStep()}</div>
      </main>
    </div>
  );
}
