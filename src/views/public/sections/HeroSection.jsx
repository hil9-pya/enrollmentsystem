import React from 'react';
import { ChevronRight, Play } from 'lucide-react';

export default function HeroSection({ onNavigate }) {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-univ-navy">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
          alt="NCST Campus" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-univ-navy-dark via-univ-navy/80 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-univ-navy-dark via-transparent to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-[1.1] mb-6 drop-shadow-lg uppercase">
            Estudyanteng Magaling, Sa <span className="text-univ-gold">NCST Galing</span>
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => onNavigate('gateway')}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-univ-gold hover:bg-yellow-500 text-univ-navy font-extrabold rounded-xl transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] hover:-translate-y-0.5 cursor-pointer"
            >
              Apply Now
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => {
                const element = document.getElementById('programs');
                if (element) {
                   const offset = 80;
                   const bodyRect = document.body.getBoundingClientRect().top;
                   const elementRect = element.getBoundingClientRect().top;
                   window.scrollTo({ top: elementRect - bodyRect - offset, behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              <Play className="w-5 h-5" />
              Explore Programs
            </button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <div className="w-8 h-12 rounded-full border-2 border-white/30 flex items-start justify-center p-2 backdrop-blur-sm">
          <div className="w-1 h-3 bg-univ-gold rounded-full animate-pulse"></div>
        </div>
      </div>
    </section>
  );
}
