import { Check } from 'lucide-react';

const STEPS = [
  { key: 'type', label: 'Enrollment Type' },
  { key: 'registration', label: 'Registration' },
  { key: 'documents', label: 'Documents' },
  { key: 'program', label: 'Program Selection' },
  { key: 'evaluation', label: 'Course Evaluation' },
  { key: 'enrollment', label: 'Subject Enrollment' },
  { key: 'payment', label: 'Payment' },
  { key: 'fulfillment', label: 'Fulfillment' },
];

export { STEPS };

export default function StepIndicator({ currentStep, completedSteps = [], onStepClick, allCompleted = false, steps = STEPS }) {
  const currentIndex = steps.findIndex((step) => step.key === currentStep);
  const canClickSteps = typeof onStepClick === 'function';
  return (
    <nav aria-label="Enrollment progress" className="w-full">
      <ol>
        {steps.map((step, index) => {
          const isCompleted = allCompleted || completedSteps.includes(step.key);
          const isCurrent = step.key === currentStep;
          const isPast = index < currentIndex;
          const canOpen = canClickSteps && (isCurrent || isPast || isCompleted);
          const isFinalConfirmation = allCompleted && isCurrent;
          const showCompletedMarker = isCompleted && !isCurrent;

          return (
            <li key={step.key} className="relative min-h-16 last:min-h-0">
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[13px] top-7 bottom-0 w-px transition-colors duration-200 ${isCompleted ? 'bg-univ-blue/60' : 'bg-slate-200'}`}
                />
              )}
              <button
                type="button"
                onClick={() => canOpen && onStepClick(step.key)}
                disabled={!canOpen}
                aria-current={isCurrent ? 'step' : undefined}
                className={`relative flex w-full items-center gap-3 text-left transition-colors ${
                  isCurrent
                    ? 'text-univ-navy'
                    : canOpen
                    ? 'text-slate-600 hover:text-univ-navy cursor-pointer'
                    : 'text-slate-400 cursor-not-allowed'
                }`}
                title={canOpen ? `Open ${step.label}` : `${step.label} is not available yet`}
              >
                <span
                  className={`ui-step-node relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isCurrent ? 'ui-step-node-current' : ''} ${
                    isFinalConfirmation
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : showCompletedMarker
                      ? 'bg-univ-blue text-white'
                      : isCurrent
                      ? 'border-2 border-white bg-univ-blue text-white ring-2 ring-univ-blue/35'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isFinalConfirmation || showCompletedMarker ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : index + 1}
                </span>
                <span className={`text-sm ${isCurrent ? 'font-bold text-univ-navy' : isCompleted ? 'font-medium text-slate-600' : 'font-medium text-slate-400'}`}>
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
