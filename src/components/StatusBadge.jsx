import { STATUS_CONFIG } from '../data/mockData';

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const colorMap = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium border rounded-sm ${colorMap[config.color] || colorMap.slate}`}
    >
      {config.label}
    </span>
  );
}
