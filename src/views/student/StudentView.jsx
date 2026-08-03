import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useAuth } from '../../context/AuthContext';
import StepIndicator from '../../components/StepIndicator';
import StudentPortalAccess from './StudentPortalAccess';
import ContinuingEnrollmentStep from './steps/ContinuingEnrollmentStep';
import CourseEvaluationStep from './steps/CourseEvaluationStep';
import SubjectEnrollmentStep from './steps/SubjectEnrollmentStep';
import PaymentStep from './steps/PaymentStep';
import FulfillmentStep from './steps/FulfillmentStep';
import ClearanceStep from './steps/ClearanceStep';
import ErrorBoundary from '../../components/ErrorBoundary';
import PortalShell from '../../components/PortalShell';
import PortalRefreshButton from '../../components/PortalRefreshButton';
import Badge from '../../components/Badge';

export const STUDENT_STEPS = [
  { key: 'clearance', label: 'Holds & Clearances' },
  { key: 'continuing', label: 'Continuing Enrollment' },
  { key: 'evaluation', label: 'Course Evaluation' },
  { key: 'enrollment', label: 'Subject Enrollment' },
  { key: 'payment', label: 'Payment' },
  { key: 'fulfillment', label: 'Fulfillment' },
];

const STEP_KEYS = STUDENT_STEPS.map((s) => s.key);


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

  const status = student.status || 'documents_approved';
  const rank = getStatusRank(status);
  const hasSelectedSubjects = student.selectedSubjects?.length > 0;
  const completed = [];

  const hasActiveHolds = student.holds?.some(h => h.status === 'active');
  
  if (!hasActiveHolds) {
    completed.push('clearance');
  }

  if (student.programId && !hasActiveHolds) {
    completed.push('continuing');
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
  if (rank >= 9) {
    completed.push('fulfillment');
  }

  return completed;
}


function getResumeStepFromStudent(student) {
  if (!student) return 'program';

  const status = student.status || 'documents_approved';
  const hasSelectedSubjects = student.selectedSubjects?.length > 0;
  const hasActiveHolds = student.holds?.some(h => h.status === 'active');

  if (hasActiveHolds) {
    return 'clearance';
  }

  switch (status) {
    case 'payment_pending':
      return 'payment';
    case 'payment_confirmed':
    case 'validation_pending':
    case 'enrolled':
      return 'fulfillment';
    case 'advising_pending':
    case 'advising_rejected':
      if (student.enrollmentType === 'continuing' && !student.academicTerm) {
        return 'continuing';
      }
      return 'evaluation';
    case 'advising_approved':
      return 'evaluation';
    case 'enrollment_pending':
      return 'enrollment';
    default:
      if (hasSelectedSubjects) return 'payment';
      if (student.programId && student.academicTerm) return 'evaluation';
      return 'continuing';
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
  const { getActiveStudent, setActiveStudent, refreshActiveStudent } = useEnrollment();
  const { user, logout } = useAuth();
  const student = getActiveStudent();
  const [isProfileReady, setIsProfileReady] = useState(false);

  const hasActiveHolds = student?.holds?.some(h => h.status === 'active');
  const [currentStep, setCurrentStep] = useState(() => {
    if (!student) return hasActiveHolds ? 'clearance' : 'continuing';
    const resumeStep = getResumeStepFromStudent(student);
    const storedStep = student.id ? localStorage.getItem(`student_current_step_${student.id}`) : null;
    const shouldUseStatusStep = student.status && student.status !== 'registration';
    return shouldUseStatusStep
      ? resumeStep
      : storedStep
      ? getFurthestStep(storedStep, resumeStep)
      : resumeStep;
  });
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isVerified, setIsVerified] = useState(() => {
    return user?.role === 'student';
  });
  const lastInitializedStudentId = useRef(null);
  const lastKnownStatus = useRef(null);

  // Load fresh status before choosing the resume step. Approved applicants
  // still review Course Evaluation before proceeding to Subject Enrollment.
  useEffect(() => {
    if (user?.role !== 'student' || !user.studentId) {
      setIsProfileReady(false);
      return;
    }

    let cancelled = false;
    setIsVerified(true);
    setIsProfileReady(false);
    setActiveStudent(user.studentId);

    refreshActiveStudent(user.studentId)
      .catch((error) => {
        console.error('Failed to refresh student profile:', error.message || error);
      })
      .finally(() => {
        if (!cancelled) setIsProfileReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.studentId, setActiveStudent, refreshActiveStudent]);

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

      const hasHolds = student.holds?.some(h => h.status === 'active');

      if (!hasHolds && !updated.includes('clearance')) {
        updated.push('clearance');
        changed = true;
      }
      if (student.programId && !updated.includes('continuing') && !hasHolds) {
        updated.push('continuing');
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
      if (rank >= 9 && !updated.includes('fulfillment')) {
        updated.push('fulfillment');
        changed = true;
      }

      return changed ? updated : prev;
    });

  }, [student]);


  const onNext = useCallback(() => {
    const idx = STEP_KEYS.indexOf(currentStep);
    if (idx < 0 || idx >= STEP_KEYS.length - 1) return;

    setCompletedSteps((prev) =>
      prev.includes(currentStep) ? prev : [...prev, currentStep]
    );
    setCurrentStep(STEP_KEYS[idx + 1]);
  }, [currentStep]);

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
      case 'clearance':
        return <ClearanceStep onNext={onNext} />;
      case 'continuing':
        return <ContinuingEnrollmentStep onNext={onNext} onBack={onBack} />;
      case 'evaluation':
        return <CourseEvaluationStep onNext={onNext} onBack={onBack} />;
      case 'enrollment':
        return <SubjectEnrollmentStep onNext={onNext} onBack={onBack} />;
      case 'payment':
        return <PaymentStep onNext={onNext} onBack={onBack} />;
      case 'fulfillment':
        return <FulfillmentStep onRefresh={() => refreshActiveStudent(user.studentId)} onReturnToGateway={() => {
              if (logout) logout();
              setActiveStudent(null);
              window.location.href = '/?portal=gateway&tab=student';
            }} />;
      default:
        return <ContinuingEnrollmentStep onNext={onNext} onBack={onBack} />;
    }
  };


  const hasStudentInfo = student && student.firstName && student.lastName;
  const currentStepDefinition = STUDENT_STEPS.find((step) => step.key === effectiveStep);
  const currentStepNumber = STUDENT_STEPS.findIndex((step) => step.key === effectiveStep) + 1;
  const isWaitingForFulfillment = effectiveStep === 'fulfillment' && student?.status !== 'enrolled';
  const isClearedForEnrollment = effectiveStep === 'clearance'
    && !(student?.holds || []).some((hold) => hold.status === 'active');
  const isCenteredStatusStep = isWaitingForFulfillment || isClearedForEnrollment;

  if (!isVerified) {
    return <StudentPortalAccess onVerified={() => setIsVerified(true)} />;
  }

  const isAuthenticatedProfile = Boolean(
    student && (student.id === user?.studentId || student.studentId === user?.studentId)
  );
  if (!isProfileReady || !isAuthenticatedProfile) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-univ-blue border-t-transparent"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading profile...</p>
        </div>
      </div>
    );
  }

  const sidebar = (<>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-68 shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-sm">
        <div className="p-5 flex flex-1 items-center overflow-y-auto">
          <StepIndicator
            currentStep={effectiveStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
            steps={STUDENT_STEPS}
            allCompleted={student?.status === 'enrolled'}
          />

        </div>

        {/* ── Student Info Footer ─────────────────────────────── */}
        {hasStudentInfo && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/30">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-premium">
              <Badge tone={student?.status === 'enrolled' ? 'success' : 'info'}>
                {student?.status === 'enrolled' ? 'Enrolled' : 'Active applicant'}
              </Badge>
              <p className="text-xs font-bold text-univ-navy mt-2 leading-none">
                {student.firstName} {student.lastName}
              </p>
              <p className="font-mono text-[9px] text-slate-400 mt-1.5">{student.studentId || student.id}</p>
            </div>
            <button
              onClick={() => {
                setActiveStudent(null);
                setIsVerified(false);
              }}
              className="mt-3 w-full py-2 border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-[10px] font-bold text-slate-500 hover:text-rose-600 transition-all rounded-lg text-center cursor-pointer uppercase tracking-wider"
            >
              Exit Portal
            </button>
          </div>
        )}
      </aside>
      </>
  );

  return (
    <PortalShell
      sidebar={sidebar}
      portalTitle="Student Portal"
      mobileTitle={currentStepDefinition?.label || 'Enrollment Progress'}
      mobileSubtitle={`Step ${currentStepNumber} of ${STUDENT_STEPS.length}`}
    >
      {/* Main Content */}
      <main className="h-full min-w-0 overflow-y-auto bg-slate-50/70">
        <div className={`${isCenteredStatusStep ? 'flex min-h-full items-center justify-center' : 'max-w-4xl mx-auto'} p-4 sm:p-5 lg:p-8`}>
          {!isCenteredStatusStep && (
            <div className="mb-4 flex justify-end">
              <PortalRefreshButton onRefresh={() => refreshActiveStudent(user.studentId)} />
            </div>
          )}
          <ErrorBoundary>
            {renderStep()}
          </ErrorBoundary>
        </div>
      </main>
    </PortalShell>
  );
}
