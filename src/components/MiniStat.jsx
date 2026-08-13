import React from 'react';

export default function MiniStat({ title, value, icon, colorClass = "text-slate-600 bg-slate-100", onClick, children }) {
  const handleKeyDown = (event) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick();
  };

  return (
    <div 
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${title}: ${value}` : undefined}
      className={`bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between gap-3 ${
        onClick ? 'cursor-pointer hover:border-slate-300 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-univ-indigo' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">{title}</p>
        <div className={`p-1.5 rounded-md shrink-0 ${colorClass}`} aria-hidden="true">
          {icon}
        </div>
      </div>
      <div className="mt-1">
        <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
      </div>
      {children && (
        <div className="mt-1">
          {children}
        </div>
      )}
    </div>
  );
}
