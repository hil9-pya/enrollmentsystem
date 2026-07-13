import React from 'react';

export default function MiniStat({ title, value, icon, colorClass = "text-slate-600 bg-slate-100", onClick, children }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between gap-3 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow transition-all' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">{title}</p>
        <div className={`p-1.5 rounded-md shrink-0 ${colorClass}`}>
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
