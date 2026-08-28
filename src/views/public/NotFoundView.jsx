import React from 'react';
import { Home, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function NotFoundView({ onNavigate }) {
  return (
    <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
            <img src="/logo.png" alt="NCST Logo" className="w-14 h-14 object-contain" />
          </div>
        </div>

        {/* 404 Graphic */}
        <div className="relative mb-6 flex justify-center">
          <span className="font-heading font-extrabold text-[9rem] leading-none text-slate-100 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-8 h-8 text-amber-500 stroke-[1.5]" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="font-heading text-2xl font-extrabold text-univ-navy mb-3 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
          The portal or page you're looking for doesn't exist.
          Please check the URL and try again, or return to one of the links below.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-univ-navy text-white text-sm font-bold rounded-xl hover:bg-univ-blue transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Go to Homepage
          </button>
          <button
            onClick={() => onNavigate('gateway')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-univ-navy text-sm font-bold rounded-xl hover:border-univ-blue hover:text-univ-blue transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Access Gateway
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-xs font-medium text-slate-400">
          © {new Date().getFullYear()} National College of Science and Technology
        </p>
      </div>
    </div>
  );
}
