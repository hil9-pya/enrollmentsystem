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

export const STUDENT_STEPS = [
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

  if (student.programId) {
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

  switch (status) {
    case 'payment_pending':
      return 'payment';
    case 'payment_confirmed':
    case 'validation_pending':
    case 'enrolled':
      return 'fulfillment';
    case 'advising_pending':
    case 'advising_rejected':
      return 'evaluation';
    case 'advising_approved':
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
  return STEP_KEYS[Math.min(storedIndex, resumeIndex)];
}

export default function StudentView() {
  const { getActiveStudent, setActiveStudent } = useEnrollment();
  const { user } = useAuth();
  const student = getActiveStudent();

  const [currentStep, setCurrentStep] = useState('continuing');
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
      if (user.studentId) {
        setActiveStudent(user.studentId);
      }
    }
  }, [user, setActiveStudent]);

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

      if (student.programId && !updated.includes('continuing')) {
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

    const status = student?.status || 'documents_approved';
    const rank = getStatusRank(status);


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
      case 'continuing':
        return <ContinuingEnrollmentStep onNext={onNext} onBack={onBack} />;
      case 'evaluation':
        return <CourseEvaluationStep onNext={onNext} onBack={onBack} />;
      case 'enrollment':
        return <SubjectEnrollmentStep onNext={onNext} onBack={onBack} />;
      case 'payment':
        return <PaymentStep onNext={onNext} onBack={onBack} />;
      case 'fulfillment':
        return <FulfillmentStep onReturnToGateway={() => {
              setActiveStudent(null);
              setIsVerified(false);
              window.location.href = '/';
            }} />;
      default:
        return <ContinuingEnrollmentStep onNext={onNext} onBack={onBack} />;
    }
  };


  const hasStudentInfo = student && student.firstName && student.lastName;

  if (!isVerified) {
    return <StudentPortalAccess onVerified={() => setIsVerified(true)} />;
  }

  return (
    <div className="flex h-full bg-[#f4f6fb]">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-68 shrink-0 border-r border-slate-200 bg-white flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col items-center gap-2 bg-slate-50/50">
          <img src="/logo.png" alt="NCST Logo" className="h-12 w-auto object-contain drop-shadow-sm" />
          <h2 className="text-[10px] font-extrabold text-univ-navy uppercase tracking-widest text-center leading-relaxed">
            National College of<br />Science &amp; Technology
          </h2>
          <span className="text-[9px] font-bold text-univ-gold uppercase tracking-wider">Gateway Portal</span>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
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
              <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider inline-block ${
                student?.status === 'enrolled'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/40'
                  : 'bg-univ-blue/10 text-univ-blue border border-univ-blue/20'
              }`}>{student?.status === 'enrolled' ? '✓ Enrolled Student' : 'Active Applicant'}</span>
              <p className="text-xs font-bold text-univ-navy mt-2 leading-none">
                {student.firstName} {student.lastName}
              </p>
              <p className="font-mono text-[9px] text-slate-400 mt-1.5">{student.id}</p>
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
 
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="max-w-4xl mx-auto p-8">{renderStep()}</div>
      </main>
    </div>
  );
}
