const TONES = {
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  info: 'bg-indigo-50/70 text-indigo-700 border-indigo-100',
  success: 'bg-emerald-50/70 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50/70 text-amber-700 border-amber-100',
  danger: 'bg-rose-50/70 text-rose-700 border-rose-100',
};

export default function Badge({ children, tone = 'neutral', className = '', ...props }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-5 ${TONES[tone] || TONES.neutral} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
