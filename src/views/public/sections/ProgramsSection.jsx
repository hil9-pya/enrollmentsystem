import React from 'react';
import { PROGRAMS } from '../../../data/mockData';
import { ArrowRight, Monitor, Cpu, Code, Database, Globe } from 'lucide-react';

export default function ProgramsSection() {
  
  // Helper to map program IDs to icons
  const getIcon = (id) => {
    if (id.includes('bsit')) return Monitor;
    if (id.includes('bscs')) return Code;
    if (id.includes('bsis')) return Database;
    if (id.includes('bsba')) return Globe;
    return Cpu;
  };

  return (
    <section id="programs" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-sm font-extrabold text-univ-blue uppercase tracking-[0.2em] mb-3">Academic Programs</h2>
          <h3 className="font-heading text-3xl sm:text-4xl font-extrabold text-univ-navy mb-6 tracking-tight">
            Discover Your Path to Success
          </h3>
          <p className="text-lg text-slate-500 font-medium leading-relaxed">
            Explore our comprehensive range of degree programs designed to equip you with the specialized knowledge and practical skills needed for the modern workforce.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PROGRAMS.map((program) => {
            const Icon = getIcon(program.id);
            return (
              <div 
                key={program.id}
                className="group bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-univ-blue/30 transition-all duration-300 flex flex-col"
              >
                <div className="p-8 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-univ-navy group-hover:bg-univ-blue group-hover:text-white transition-colors duration-300 mb-6">
                    <Icon className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">{program.department}</h4>
                  <h3 className="text-lg font-bold text-univ-navy leading-tight mb-4">{program.name}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    A comprehensive {program.duration} program that prepares students for professional careers in {program.department}.
                  </p>
                </div>
                <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center group-hover:bg-univ-blue/5 transition-colors duration-300">
                  <span className="text-xs font-bold text-slate-600 group-hover:text-univ-blue transition-colors">Learn More</span>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 group-hover:text-univ-blue group-hover:bg-univ-blue/10 transition-all duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
