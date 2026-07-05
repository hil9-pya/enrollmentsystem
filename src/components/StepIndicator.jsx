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

export default function StepIndicator({ currentStep, completedSteps = [], onStepClick }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  const canClickSteps = typeof onStepClick === 'function';

  return (
    <nav className="flex flex-col gap-1">
      {STEPS.map((step, index) => {
        const isCompleted = completedSteps.includes(step.key);
        const isCurrent = step.key === currentStep;
        const isPast = index < currentIndex;
        const canOpen = canClickSteps && (isCurrent || isPast || isCompleted);

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => canOpen && onStepClick(step.key)}
            disabled={!canOpen}
            aria-current={isCurrent ? 'step' : undefined}
            className={`flex w-full items-start gap-3 rounded-md text-left transition-colors duration-150 ${
              canOpen ? 'cursor-pointer hover:bg-slate-50' : 'cursor-not-allowed'
            }`}
            title={canOpen ? `Open ${step.label}` : `${step.label} is not available yet`}
          >
            {/* Connector + Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-medium shrink-0 transition-colors duration-150 ${
                  isCompleted || isPast
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : isCurrent
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-slate-300 text-slate-400 bg-white'
                }`}
              >
                {isCompleted || isPast ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-0.5 h-6 my-1 ${
                    isPast || isCompleted ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
            {/* Label */}
            <span
              className={`text-sm pt-1 ${
                isCurrent
                  ? 'font-semibold text-slate-900'
                  : isPast || isCompleted
                  ? 'font-medium text-slate-600'
                  : 'text-slate-400'
              }`}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
