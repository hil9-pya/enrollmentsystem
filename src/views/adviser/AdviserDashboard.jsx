import React, { useMemo } from 'react';
import { Clock, CheckCircle, AlertTriangle, ArrowRight, Activity, BookOpen } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import MiniStat from '../../components/MiniStat';

export default function AdviserDashboard({ students, onNavigate }) {
  const metrics = useMemo(() => {
    const relevantStudents = students.filter(s => 
      ['advising_pending', 'advising_approved', 'advising_rejected', 'payment_pending', 'enrolled'].includes(s.status)
    );

    const pending = relevantStudents.filter(s => s.status === 'advising_pending').length;
    const approved = relevantStudents.filter(s => ['advising_approved', 'payment_pending', 'enrolled'].includes(s.status)).length;
    const returned = relevantStudents.filter(s => s.status === 'advising_rejected').length;

    const actionRequired = relevantStudents
      .filter(s => s.status === 'advising_pending')
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 5);

    const recentActivity = [...relevantStudents]
      .filter(s => s.status !== 'advising_pending')
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 8);

    return { pending, approved, returned, actionRequired, recentActivity };
  }, [students]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 p-6 h-full overflow-y-auto bg-slate-50">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Evaluation Overview</h1>
          <p className="text-sm text-slate-500 mt-1">High-level view of curriculum evaluation progress.</p>
        </div>
      </div>

      {/* Mini Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniStat 
          title="Pending Evaluation" 
          value={metrics.pending} 
          icon={<Clock className="w-4 h-4" />} 
          colorClass="text-amber-600 bg-amber-50"
          onClick={() => onNavigate('pending')}
        />
        <MiniStat 
          title="Approved Curriculums" 
          value={metrics.approved} 
          icon={<CheckCircle className="w-4 h-4" />} 
          colorClass="text-emerald-600 bg-emerald-50"
          onClick={() => onNavigate('approved')}
        />
        <MiniStat 
          title="Returned for Revision" 
          value={metrics.returned} 
          icon={<AlertTriangle className="w-4 h-4" />} 
          colorClass="text-rose-600 bg-rose-50"
          onClick={() => onNavigate('rejected')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Quick Action */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                 <BookOpen className="w-4 h-4 text-univ-indigo" /> Priority Queue
              </h2>
              <button 
                onClick={() => onNavigate('pending')}
                className="text-xs font-semibold text-univ-indigo hover:text-indigo-700 transition-colors"
              >
                Open Evaluation Workspace
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-slate-50/50">
              {metrics.actionRequired.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 border border-slate-200 shadow-sm">
                    <CheckCircle className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">All caught up!</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">There are no pending evaluations.</p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    {metrics.actionRequired.map((student, index) => (
                      <div key={student.id} className={`p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors ${index !== metrics.actionRequired.length - 1 ? 'border-b border-slate-100' : ''}`}>
                         <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-univ-indigo font-bold text-sm">
                              {student.firstName[0]}{student.lastName[0]}
                           </div>
                           <div>
                             <p className="text-sm font-bold text-slate-900">{student.firstName} {student.lastName}</p>
                             <p className="text-xs font-medium text-slate-500">{student.id}</p>
                           </div>
                         </div>
                         <button
                           onClick={() => onNavigate('pending')}
                           className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-md text-xs font-bold hover:bg-slate-50 hover:text-univ-indigo transition-colors shadow-sm"
                         >
                           Evaluate
                         </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {metrics.pending > 5 && (
              <div className="p-3 border-t border-slate-200 bg-white text-center">
                <p className="text-xs font-semibold text-slate-500">+ {metrics.pending - 5} more students waiting in queue.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="h-[500px]">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" /> Recent Evaluations
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {metrics.recentActivity.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {metrics.recentActivity.map(student => (
                    <div 
                      key={student.id} 
                      className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50 rounded-md transition-colors" 
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {student.firstName || 'Anonymous'} {student.lastName || 'Applicant'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">
                          {student.id}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={student.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm py-8">
                  No recent activity.
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}


