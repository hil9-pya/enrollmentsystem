import React, { useState } from 'react';
import { Briefcase, ArrowLeft } from 'lucide-react';
import LoginView from '../auth/LoginView';
import ApplicantPortalAccess from '../applicant/ApplicantPortalAccess';

export default function GatewayView({ onVerified, onBack }) {
  const [viewMode, setViewMode] = useState('applicant'); // 'applicant', 'student', 'staff', 'admin'

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-[#f4f6fb]">
      {/* Left side: Premium Image */}
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
          <div className="flex items-center gap-5 mb-8">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-xl">
               <img src="/logo.png" alt="NCST Logo" className="h-14 w-14 object-contain" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-4xl tracking-tight uppercase leading-tight text-white drop-shadow-md">National College of<br/>Science &amp; Technology</h1>
            </div>
          </div>
          <p className="text-slate-200 font-medium text-base max-w-lg leading-relaxed drop-shadow">
            Empowering the next generation of innovators and leaders. Access your centralized portal for enrollment, academics, and administration.
          </p>
        </div>
      </div>
      
      {/* Right side: Access Panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 xl:p-24 relative bg-white overflow-y-auto">
        {/* Top bar for mobile only */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-3">
           <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-univ-navy rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
           </button>
           <img src="/logo.png" alt="NCST Logo" className="h-8 w-8 object-contain" />
           <span className="font-heading font-bold text-univ-navy uppercase text-xs tracking-wider">NCST Gateway</span>
        </div>
        
        <div className="w-full max-w-md mt-12 lg:mt-0">
           <div className="mb-6 text-center lg:text-left">
             <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-univ-navy tracking-tight mb-3">Welcome Back</h2>
             <p className="text-slate-500 font-medium text-sm">Please select your portal access option below to begin.</p>
           </div>
           
           <div className="flex bg-slate-100 p-1.5 rounded-xl shadow-sm border border-slate-200/60 mb-6">
              {['applicant', 'student', 'staff'].map((role) => (
                <button 
                  key={role}
                  onClick={() => setViewMode(role)}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 outline-none focus:outline-none focus:ring-0 cursor-pointer ${viewMode === role || (role === 'staff' && viewMode === 'admin') ? 'bg-white text-univ-blue shadow-sm border border-slate-200/50' : 'text-slate-500 hover:bg-slate-200/50 hover:text-univ-navy'}`}
                >
                  {role}
                </button>
              ))}
           </div>
           
           <div className="bg-white rounded-2xl shadow-premium border border-slate-100 p-2 h-[480px] flex flex-col outline-none focus:outline-none relative">
             {(viewMode === 'admin' || viewMode === 'staff' || viewMode === 'student') ? (
               <div className="flex-1 flex flex-col outline-none focus:outline-none p-6 sm:p-8 overflow-y-auto animate-in fade-in zoom-in-95 duration-500">
                  <LoginView portalType={viewMode} />
               </div>
             ) : viewMode === 'applicant' ? (
               <div className="flex-1 flex flex-col outline-none focus:outline-none p-6 sm:p-8 overflow-y-auto animate-in fade-in zoom-in-95 duration-500">
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
           
           {/* Footer right side */}
           <div className="mt-8 text-center flex flex-col items-center gap-4">
             <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
               <span className="hover:text-univ-blue cursor-pointer transition-colors">Privacy</span>
               <span className="hover:text-univ-blue cursor-pointer transition-colors">Support</span>
               <button onClick={onBack} className="hover:text-univ-blue cursor-pointer transition-colors">Website</button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
