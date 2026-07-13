import React, { useState, useMemo } from 'react';
import { Search, ArrowRight, Clock, CheckCircle, FileWarning, FileText, Check, X, GraduationCap } from 'lucide-react';
import { PROGRAMS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';
import { useEnrollment } from '../../context/EnrollmentContext';
import { useConfirm } from '../../context/ConfirmationContext';
export default function AdvisingQueue({ students, initialFilter, onNavigate }) {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const filter = initialFilter || 'all';

  const relevantStudents = useMemo(() => {
    return students.filter(s => 
      ['advising_pending', 'advising_approved', 'advising_rejected', 'payment_pending', 'enrolled'].includes(s.status)
    );
  }, [students]);

  const filteredStudents = useMemo(() => {
    let result = relevantStudents;

    if (filter === 'pending') {
      result = result.filter(s => s.status === 'advising_pending');
    } else if (filter === 'approved') {
      result = result.filter(s => ['advising_approved', 'payment_pending', 'enrolled'].includes(s.status));
    } else if (filter === 'rejected') {
      result = result.filter(s => s.status === 'advising_rejected');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => a.id.localeCompare(b.id));
  }, [relevantStudents, filter, searchQuery]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const { dispatch } = useEnrollment();
  const { confirm } = useConfirm();
  const [notes, setNotes] = useState('');

  async function handleApprove() {
    if (!selectedStudent) return;
    const isConfirmed = await confirm({
      title: 'Approve Advising',
      message: `Are you sure you want to approve academic advising for ${selectedStudent.firstName} ${selectedStudent.lastName}?`,
      confirmText: 'Approve Advising',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!isConfirmed) return;
    await dispatch({
      type: 'APPROVE_ADVISING',
      payload: { studentId: selectedStudent.id, notes }
    });
    setNotes('');
    setSelectedStudentId(null);
  }

  async function handleReject() {
    if (!selectedStudent) return;
    const isConfirmed = await confirm({
      title: 'Return to Student',
      message: `Are you sure you want to return the application of ${selectedStudent.firstName} ${selectedStudent.lastName} for revision?`,
      confirmText: 'Return Application',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!isConfirmed) return;
    await dispatch({
      type: 'REJECT_ADVISING',
      payload: { studentId: selectedStudent.id, notes }
    });
    setNotes('');
    setSelectedStudentId(null);
  }

  return (
    <div className="h-full flex overflow-hidden bg-slate-50">
      
      {/* Left Pane: Inbox Queue */}
      <div className="w-full sm:w-[350px] shrink-0 border-r border-slate-200 bg-white flex flex-col h-full z-10 shadow-sm relative">
        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 tracking-wide">Evaluation Queue</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{filter} records</p>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-9 pr-3 text-xs font-medium focus:outline-none focus:border-univ-indigo focus:ring-1 focus:ring-univ-indigo transition-all"
            />
          </div>

          <div className="flex border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm mt-2">
            {[
              { id: 'pending', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Returned' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { onNavigate(f.id); }}
                className={`flex-1 text-[10px] font-bold px-2 py-1.5 transition-colors cursor-pointer border-r last:border-r-0 border-slate-200/60 ${
                  filter === f.id
                    ? 'bg-slate-100 text-slate-900 shadow-inner'
                    : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm font-medium flex flex-col items-center">
               <GraduationCap className="h-8 w-8 mb-3 opacity-20 text-slate-500" />
               <p className="text-xs font-bold text-slate-500">No students found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full text-left p-4 transition-colors hover:bg-slate-50 ${selectedStudentId === student.id ? 'bg-indigo-50/50 relative' : ''}`}
                >
                  {selectedStudentId === student.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-univ-indigo"></div>
                  )}
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-bold text-slate-900 text-sm truncate pr-2">
                      {student.firstName} {student.lastName}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">{student.id}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-500 truncate mb-2.5">
                    {PROGRAMS.find(p => p.id === student.programId)?.name || '—'}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {student.enrollmentType}
                    </span>
                    <span className="text-[10px]">
                      <StatusBadge status={student.status} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Detailed View */}
      <div className={`flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden ${selectedStudent ? 'block' : 'hidden sm:flex'}`}>
        {selectedStudent ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
              
              <div className="max-w-3xl mx-auto">
                {/* Header Profile */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </h1>
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{selectedStudent.id}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      <span className="text-univ-indigo font-bold">{PROGRAMS.find(p => p.id === selectedStudent.programId)?.name}</span>
                    </div>
                  </div>
                  <StatusBadge status={selectedStudent.status} />
                </div>
                
                {/* Simulated Document / Curriculum View */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-8">
                  <div className="border-b border-slate-200 bg-slate-50/80 p-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-univ-indigo" />
                      Curriculum Evaluation Form
                    </h3>
                    <span className="text-[10px] font-bold text-univ-indigo bg-indigo-50 px-2.5 py-1 rounded tracking-wider uppercase">Semester 1, 2026</span>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {/* Placeholder data mimicking a document */}
                      <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-700">ENG101 - Purposive Communication</p>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">3 Units • Lecture</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded">Validated</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-700">MATH101 - Mathematics in the Modern World</p>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">3 Units • Lecture</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded">Validated</span>
                      </div>
                      <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-700">STS101 - Science, Technology and Society</p>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">3 Units • Lecture</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded">Validated</span>
                      </div>
                    </div>
                    
                    {selectedStudent.status === 'advising_pending' && (
                      <div className="mt-8 p-5 bg-amber-50/50 border border-amber-200/60 rounded-lg">
                        <p className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-2">
                          <FileWarning className="w-4 h-4 text-amber-500" />
                          Adviser Notes
                        </p>
                        <p className="text-xs text-amber-700/80 mb-3 font-medium">Add remarks regarding prerequisite credits or overrides before final approval.</p>
                        <textarea 
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full text-sm font-medium text-slate-700 p-3 border border-amber-300/50 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white placeholder-slate-400 transition-shadow" 
                          rows="3"
                          placeholder="Type evaluation remarks here..."
                        ></textarea>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
            </div>
            
            {/* Sticky Action Footer - Only show if pending */}
            {selectedStudent.status === 'advising_pending' && (
              <div className="border-t border-slate-200 bg-white p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.03)] z-20 shrink-0">
                <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs font-semibold text-slate-500 hidden sm:block">
                    Ensure all subjects are properly credited before approving.
                  </p>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => setSelectedStudentId(null)}
                      className="sm:hidden flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleReject}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-rose-100 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-50 hover:border-rose-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Return
                    </button>
                    <button 
                      onClick={handleApprove}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-5 border border-slate-200 shadow-sm">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-bold text-slate-500">No student selected</p>
            <p className="text-sm font-medium text-slate-400 mt-1">Select a student from the evaluation queue</p>
          </div>
        )}
      </div>
    </div>
  );
}
