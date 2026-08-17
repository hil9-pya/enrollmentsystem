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
      className={`bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-between gap-2 ${
        onClick ? 'cursor-pointer hover:border-slate-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-univ-indigo' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <div className={`shrink-0 ${colorClass.split(' ')[0]}`} aria-hidden="true">
          {icon}
        </div>
      </div>
      <div className="mt-1">
        <p className="text-2xl font-bold text-slate-950 leading-none">{value}</p>
      </div>
      {children && (
        <div className="mt-1">
          {children}
        </div>
      )}
    </div>
  );
}
