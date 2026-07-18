import React, { useState, useMemo, useEffect } from 'react';
import { Search, ArrowRight, Clock, CheckCircle, FileWarning, FileText, Check, X, GraduationCap } from 'lucide-react';
import { PROGRAMS, SUBJECTS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';
import { useEnrollment } from '../../context/EnrollmentContext';
import { toast } from 'react-hot-toast';

export default function AdvisingQueue({ students, initialFilter, onNavigate }) {
  const { dispatch } = useEnrollment();
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const filter = initialFilter || 'all';

  // Evaluation States
  const [academicRecord, setAcademicRecord] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [adviserNotes, setAdviserNotes] = useState('');

  const relevantStudents = useMemo(() => {
    return students.filter(s => 
      ['advising_pending', 'advising_approved', 'advising_rejected', 'payment_pending', 'enrolled'].includes(s.status)
    );
  }, [students]);

  const filteredStudents = useMemo(() => {
    let result = relevantStudents;
    if (filter === 'pending') result = result.filter(s => s.status === 'advising_pending');
    else if (filter === 'approved') result = result.filter(s => ['advising_approved', 'payment_pending', 'enrolled'].includes(s.status));
    else if (filter === 'rejected') result = result.filter(s => s.status === 'advising_rejected');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    }
    return result.sort((a, b) => a.id.localeCompare(b.id));
  }, [relevantStudents, filter, searchQuery]);

  const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId) || null, [students, selectedStudentId]);

  // Sync Evaluation State
  useEffect(() => {
    if (selectedStudent) {
      setAcademicRecord(selectedStudent.academicRecord || []);
      setSelectedSubjects(selectedStudent.selectedSubjects?.map(s => s.subjectId) || []);
      setAdviserNotes(selectedStudent.adviserNotes || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId]);

  // Compute Eligible Subjects
  const programPrefix = selectedStudent?.programId === 'bscs' ? 'cs' : selectedStudent?.programId === 'bsba' ? 'ba' : 'nu';
  
  const eligibleSubjects = useMemo(() => {
    if (!selectedStudent || !programPrefix) return [];
    
    const passedSubjectIds = academicRecord.filter(r => r.grade <= 3.0).map(r => r.subjectId);

    return SUBJECTS.filter(sub => {
      if (!sub.id.startsWith(programPrefix)) return false;
      if (passedSubjectIds.includes(sub.id)) return false;
      if (!sub.prerequisites || sub.prerequisites.length === 0) return true;
      return sub.prerequisites.every(prereq => passedSubjectIds.includes(prereq));
    });
  }, [selectedStudent, programPrefix, academicRecord]);

  const toggleCompleted = (id) => {
    setAcademicRecord(prev => {
      if (prev.find(r => r.subjectId === id)) {
        return prev.filter(r => r.subjectId !== id);
      } else {
        return [...prev, { subjectId: id, grade: 2.0, term: 'transfer' }];
      }
    });
  };

  const toggleSelected = (id) => {
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleApprove = async () => {
    try {
      const maxYear = eligibleSubjects.length > 0 ? Math.max(...eligibleSubjects.map(s => s.yearLevel || 1)) : 1;
      await dispatch({
        type: 'UPDATE_STUDENT_SUBJECTS',
        payload: {
          studentId: selectedStudent.id,
          subjects: selectedSubjects.map(id => ({ subjectId: id })),
          academicRecord,
          yearLevel: maxYear
        }
      });
      await dispatch({
        type: 'APPROVE_ADVISING',
        payload: { studentId: selectedStudent.id, notes: adviserNotes }
      });
      toast.success('Evaluation Approved!');
      setSelectedStudentId(null);
    } catch (err) {
       console.error("Failed to approve", err);
    }
  };

  const handleReject = async () => {
    try {
      await dispatch({
        type: 'REJECT_ADVISING',
        payload: { studentId: selectedStudent.id, notes: adviserNotes }
      });
      toast.success('Evaluation Returned!');
      setSelectedStudentId(null);
    } catch (err) {
       console.error("Failed to reject", err);
    }
  };

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
                
                {selectedStudent.status === 'advising_pending' && (selectedStudent.enrollmentType === 'transfer' || selectedStudent.enrollmentType === 'returning' || selectedStudent.enrollmentType === 'continuing') && (
                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-8">
                    <div className="border-b border-slate-200 bg-slate-50/80 p-4">
                      <h3 className="text-sm font-bold text-slate-900">Step 1: Credited Subjects</h3>
                      <p className="text-xs text-slate-500">Check off the subjects this student has already passed.</p>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                        {SUBJECTS.filter(s => s.id.startsWith(programPrefix)).map(sub => (
                          <div 
                            key={sub.id} 
                            onClick={() => toggleCompleted(sub.id)}
                            className={`flex items-center gap-2 text-sm p-2 rounded border cursor-pointer transition-colors ${
                              academicRecord.find(r => r.subjectId === sub.id)
                                ? 'bg-univ-indigo/10 border-univ-indigo/30'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              checked={!!academicRecord.find(r => r.subjectId === sub.id)} 
                              readOnly
                              className="rounded text-univ-indigo accent-univ-indigo border-slate-300 focus:ring-univ-indigo transition-all cursor-pointer pointer-events-none" 
                            />
                            <span className="font-semibold text-slate-700">{sub.code}</span>
                            <span className="text-xs text-slate-500 truncate">{sub.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-8">
                  <div className="border-b border-slate-200 bg-slate-50/80 p-4">
                    <h3 className="text-sm font-bold text-slate-900">{selectedStudent.status === 'advising_pending' ? 'Step 2: Assign Eligible Subjects' : 'Assigned Subjects'}</h3>
                  </div>
                  <div className="p-4">
                    {selectedStudent.status === 'advising_pending' ? (
                      eligibleSubjects.length > 0 ? (
                        <div className="space-y-2">
                           {eligibleSubjects.map(sub => (
                             <div 
                               key={sub.id} 
                               onClick={() => toggleSelected(sub.id)}
                               className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                                 selectedSubjects.includes(sub.id)
                                   ? 'bg-univ-blue/5 border-univ-blue/30'
                                   : 'bg-white border-slate-200 hover:border-univ-blue'
                               }`}
                             >
                               <div className="flex items-center gap-3">
                                 <input 
                                   type="checkbox" 
                                   checked={selectedSubjects.includes(sub.id)} 
                                   readOnly
                                   className="w-5 h-5 rounded text-univ-blue accent-univ-blue border-slate-300 focus:ring-univ-blue transition-all cursor-pointer pointer-events-none" 
                                 />
                                 <div>
                                   <p className="text-sm font-bold text-slate-800">{sub.code} - {sub.name}</p>
                                   <p className="text-xs text-slate-500">Year {sub.yearLevel || 1} • {sub.units || 3} Units</p>
                                 </div>
                               </div>
                               <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-1 rounded">Eligible</span>
                             </div>
                           ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No eligible subjects found based on prerequisites.</p>
                      )
                    ) : (
                      <div className="space-y-2">
                         {selectedSubjects.map(id => {
                            const sub = SUBJECTS.find(s => s.id === id);
                            if (!sub) return null;
                            return (
                              <div key={id} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-0">
                                <div>
                                  <p className="text-sm font-bold text-slate-700">{sub.code} - {sub.name}</p>
                                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{sub.units || 3} Units</p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded">Assigned</span>
                              </div>
                            );
                         })}
                      </div>
                    )}
                  </div>
                  
                  {selectedStudent.status === 'advising_pending' && (
                    <div className="p-5 bg-amber-50/50 border-t border-amber-200/60">
                      <p className="text-xs font-bold text-amber-900 mb-1 flex items-center gap-2">
                        <FileWarning className="w-4 h-4 text-amber-500" />
                        Adviser Notes
                      </p>
                      <textarea 
                        value={adviserNotes}
                        onChange={(e) => setAdviserNotes(e.target.value)}
                        className="w-full text-sm font-medium text-slate-700 p-3 mt-2 border border-amber-300/50 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/50 bg-white placeholder-slate-400 transition-shadow" 
                        rows="3"
                        placeholder="Type evaluation remarks here..."
                      ></textarea>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Sticky Action Footer */}
            {selectedStudent.status === 'advising_pending' && (
              <div className="border-t border-slate-200 bg-white p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.03)] z-20 shrink-0">
                <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs font-semibold text-slate-500 hidden sm:block">
                    Ensure all subjects are properly credited before approving.
                  </p>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button onClick={() => setSelectedStudentId(null)} className="sm:hidden flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold transition-colors">
                      Back
                    </button>
                    <button onClick={handleReject} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white border-2 border-rose-100 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-50 hover:border-rose-200 transition-colors">
                      <X className="w-4 h-4" />
                      Return
                    </button>
                    <button onClick={handleApprove} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm">
                      <Check className="w-4 h-4" />
                      Approve Evaluation
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
