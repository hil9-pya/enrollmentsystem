import React from 'react';
import { BookOpen } from 'lucide-react';

export default function InstructorSidebar() {
  return (
    <aside className="flex w-68 shrink-0 flex-col border-r border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/50 p-6">
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-univ-navy">Instructor Portal</h2>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Faculty Access</p>
      </div>
      <nav className="flex-1 px-4 py-4" aria-label="Instructor portal">
        <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Teaching</p>
        <button
          type="button"
          aria-current="page"
          className="flex w-full items-center gap-3 rounded-md bg-univ-indigo/10 px-3 py-2 text-left text-xs font-semibold text-univ-indigo shadow-sm"
        >
          <BookOpen className="h-4 w-4" />
          My Classes
        </button>
      </nav>
    </aside>
  );
}
