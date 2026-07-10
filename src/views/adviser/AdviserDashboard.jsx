import React, { useMemo } from 'react';
import { ArrowRight, Clock, CheckCircle, FileWarning, Activity, Search } from 'lucide-react';
import { PROGRAMS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';
import MiniStat from '../../components/MiniStat';

export default function AdviserDashboard({ students, onNavigate }) {
  const metrics = useMemo(() => {
    const pendingStudents = students.filter(s => s.status === 'advising_pending');
    
    // Sort pending by ID to simulate oldest first (or however they are ordered)
    const actionRequired = [...pendingStudents].sort((a, b) => a.id.localeCompare(b.id)).slice(0, 10);

    const recentActivity = [...students]
      .filter(s => ['advising_approved', 'advising_rejected', 'payment_pending', 'enrolled'].includes(s.status))
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 8);

    const pending = pendingStudents.length;
    const approved = students.filter(s => ['advising_approved', 'payment_pending', 'enrolled'].includes(s.status)).length;
    const rejected = students.filter(s => s.status === 'advising_rejected').length;

    return { actionRequired, recentActivity, pending, approved, rejected };
  }, [students]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 p-6 h-full overflow-y-auto bg-slate-50">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Advising Workspace</h1>
          <p className="text-sm text-slate-500 mt-1">Manage pending curriculum evaluations and recent activity.</p>
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
          title="Approved Today" 
          value={metrics.approved} 
          icon={<CheckCircle className="w-4 h-4" />} 
          colorClass="text-emerald-600 bg-emerald-50"
          onClick={() => onNavigate('approved')}
        />
        <MiniStat 
          title="Returned for Revision" 
          value={metrics.rejected} 
          icon={<FileWarning className="w-4 h-4" />} 
          colorClass="text-rose-600 bg-rose-50"
          onClick={() => onNavigate('rejected')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Action Required Queue */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Action Required: Pending Evaluations</h2>
              <button 
                onClick={() => onNavigate('pending')}
                className="text-xs font-semibold text-univ-indigo hover:text-indigo-700 transition-colors"
              >
                View Full Queue
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="px-4 py-2 font-semibold">Student</th>
                    <th className="px-4 py-2 font-semibold">Program</th>
                    <th className="px-4 py-2 font-semibold">Type</th>
                    <th className="px-4 py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.actionRequired.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-slate-500 font-medium">
                        No pending evaluations in the queue.
                      </td>
                    </tr>
                  ) : (
                    metrics.actionRequired.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{student.firstName} {student.lastName}</span>
                            <span className="text-[10px] font-mono text-slate-500">{student.id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-slate-600 truncate max-w-[150px] inline-block" title={PROGRAMS.find(p => p.id === student.programId)?.name}>
                            {PROGRAMS.find(p => p.id === student.programId)?.name || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-slate-500 capitalize">{student.enrollmentType}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => onNavigate('verification')} // Assuming verification is the eval route
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-univ-indigo bg-indigo-50 hover:bg-univ-indigo hover:text-white rounded-md transition-colors"
                          >
                            Evaluate
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="h-[500px]">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-full">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" /> Recent Decisions
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {metrics.recentActivity.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {metrics.recentActivity.map(student => (
                    <div 
                      key={student.id} 
                      className="flex items-center justify-between gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors" 
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


