import React, { useState } from 'react';
import { Briefcase, ArrowLeft } from 'lucide-react';
import LoginView from '../auth/LoginView';
import ApplicantPortalAccess from '../applicant/ApplicantPortalAccess';

export default function GatewayView({ onVerified, onBack, onLogin, initialView = 'applicant' }) {
  const [viewMode, setViewMode] = useState(initialView); // 'applicant', 'student', 'staff', 'admin'

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-[#f4f6fb]">
      {/* Left-side campus context */}
      <div className="hidden lg:flex w-1/2 relative bg-univ-navy">
        <img 
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" 
          alt="Campus" 
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-univ-navy-dark via-univ-navy/40 to-transparent"></div>
        
        {/* Back to Home Button */}
        <button 
          onClick={onBack}
          className="absolute top-8 left-8 z-20 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all font-bold text-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Website
        </button>

        <div className="absolute bottom-16 left-16 right-16 z-10 text-white">
          <div className="mb-6 flex items-center gap-4">
            <img src="/logo.png" alt="NCST Logo" className="h-14 w-14 object-contain" />
            <div>
              <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-md">National College of<br/>Science &amp; Technology</h1>
            </div>
          </div>
          <p className="max-w-lg text-base font-medium leading-relaxed text-slate-200 drop-shadow">
            Apply for admission, continue enrollment, or access assigned staff services from one secure gateway.
          </p>
        </div>
      </div>
      
      {/* Right side: Access Panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-start p-8 sm:p-12 xl:p-24 relative bg-white overflow-y-auto">
        {/* Top bar for mobile only */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
           <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-univ-navy rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
           </button>
           <img src="/logo.png" alt="NCST Logo" className="h-8 w-8 object-contain" />
           <span className="font-heading font-bold text-univ-navy uppercase text-xs tracking-wider">NCST Gateway</span>
        </div>
        
        <div className="w-full max-w-md mt-20 sm:mt-16 lg:mt-0">
           <div className="mb-6 text-center lg:text-left">
             <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-univ-navy tracking-tight mb-3">Sign in to NCST</h2>
             <p className="text-slate-500 font-medium text-sm">Choose your portal to continue.</p>
           </div>
           
           <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-sm border border-slate-200/60 mb-6">
              {[
                { id: 'applicant', label: 'Applicant' },
                { id: 'student', label: 'Student' },
                { id: 'staff', label: 'Staff & admin' }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setViewMode(tab.id)}
                className={`flex-1 min-h-11 px-2 py-3 text-xs font-bold rounded-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-univ-indigo ${viewMode === tab.id || (tab.id === 'staff' && viewMode === 'admin') ? 'bg-white text-univ-blue shadow-sm border border-slate-200/50' : 'text-slate-500 hover:bg-slate-200/50 hover:text-univ-navy'}`}
                aria-pressed={viewMode === tab.id || (tab.id === 'staff' && viewMode === 'admin')}
                >
                  {tab.label}
                </button>
              ))}
           </div>
           
           <div className="bg-white rounded-lg shadow-premium border border-slate-200 p-2 min-h-[420px] flex flex-col relative">
             {(viewMode === 'admin' || viewMode === 'staff' || viewMode === 'student') ? (
               <div className="flex-1 flex flex-col p-6 sm:p-8 animate-in fade-in duration-300">
                  <LoginView portalType={viewMode} onLogin={onLogin} />
               </div>
             ) : viewMode === 'applicant' ? (
               <div className="flex-1 flex flex-col p-6 sm:p-8 animate-in fade-in duration-300">
                  <ApplicantPortalAccess onVerified={onVerified} />
               </div>
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-xl m-2 bg-slate-50/50">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Select a portal above.</p>
                </div>
             )}
           </div>
           
           <div className="mt-8 text-center">
             <button onClick={onBack} className="text-xs font-semibold text-slate-500 transition-colors hover:text-univ-blue">Return to NCST website</button>
           </div>
        </div>
      </div>
    </div>
  );
}
