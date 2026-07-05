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
            className={`flex w-full items-center gap-3.5 p-3 rounded-xl border transition-all duration-200 text-left ${
              isCurrent
                ? 'bg-white shadow-premium border-slate-200 text-univ-navy ring-1 ring-slate-100'
                : canOpen
                ? 'bg-transparent border-transparent hover:bg-slate-100/50 cursor-pointer text-slate-700'
                : 'bg-transparent border-transparent opacity-45 cursor-not-allowed text-slate-400'
            }`}
            title={canOpen ? `Open ${step.label}` : `${step.label} is not available yet`}
          >
            {/* Connector + Circle */}
            <div className="flex items-center justify-center shrink-0">
              <div
                className={`w-7.5 h-7.5 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all duration-200 ${
                  isCompleted || isPast
                    ? 'bg-univ-blue border-univ-blue text-white shadow-sm'
                    : isCurrent
                    ? 'bg-univ-gold border-univ-gold text-univ-navy shadow-sm'
                    : 'border-slate-200 text-slate-400 bg-slate-50'
                }`}
              >
                {isCompleted || isPast ? (
                  <Check className="h-4 w-4 stroke-[3]" />
                ) : (
                  index + 1
                )}
              </div>
            </div>
            {/* Label & Status Info */}
            <div className="flex flex-col">
              <span
                className={`text-xs tracking-wide transition-colors ${
                  isCurrent
                    ? 'font-extrabold text-univ-navy'
                    : isPast || isCompleted
                    ? 'font-bold text-slate-700'
                    : 'font-medium text-slate-400'
                }`}
              >
                {step.label}
              </span>
              {isCurrent && (
                <span className="text-[9px] text-univ-gold font-bold uppercase tracking-wider mt-0.5 animate-pulse">Active Step</span>
              )}
              {isCompleted && !isCurrent && (
                <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">Completed</span>
              )}
            </div>
          </button>
        );
      })}
    </nav>
  );
}
