import React, { useMemo } from 'react';
import { ArrowRight, Inbox, Activity, CheckCircle, Clock, Users } from 'lucide-react';
import { PROGRAMS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';
import MiniStat from '../../components/MiniStat';

export default function DashboardOverview({ students, onNavigate }) {
  const metrics = useMemo(() => {
    const totalApplicants = students.length;
    const pendingReview = students.filter(s => s.status === 'documents_submitted');
    const justRegistered = students.filter(s => s.status === 'registration');
    const approved = students.filter(s => s.status === 'documents_approved' || s.status === 'enrolled');

    const recentSubmissions = [...students]
      .filter(s => s.status !== 'registration')
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 8); // increased to 8 since rows are tighter

    return { totalApplicants, pendingReview, justRegistered, approved, recentSubmissions };
  }, [students]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 p-6 h-full overflow-y-auto bg-slate-50">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of applicant pipeline and recent activity.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Action Queue & Pipeline */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Action Queue */}
          <div className="rounded-lg bg-univ-navy text-white p-6 shadow-sm border border-indigo-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/10 rounded-md shrink-0">
                <Inbox className="w-6 h-6 text-indigo-100" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Action Required</span>
                </div>
                <h2 className="text-2xl font-bold">
                  {metrics.pendingReview.length} Applications Ready
                </h2>
                <p className="text-sm text-indigo-100/70 mt-1">
                  Documents submitted and waiting for verification.
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => onNavigate('verification')}
              className="shrink-0 flex items-center justify-center gap-2 bg-white text-univ-navy px-4 py-2 rounded-md font-semibold text-sm hover:bg-slate-50 transition-colors border border-transparent focus:ring-2 focus:ring-offset-2 focus:ring-offset-univ-navy focus:ring-white focus:outline-none"
            >
              Review Now
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Pipeline */}
          <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
               Applicant Pipeline
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <PipelineStat 
                title="Registered" 
                count={metrics.justRegistered.length} 
                total={metrics.totalApplicants}
                icon={<Users className="w-4 h-4" />}
                colorClass="text-slate-600 bg-slate-100"
                barColorClass="bg-slate-300"
              />
              <PipelineStat 
                title="Awaiting Review" 
                count={metrics.pendingReview.length} 
                total={metrics.totalApplicants}
                icon={<Clock className="w-4 h-4" />}
                colorClass="text-amber-600 bg-amber-50"
                barColorClass="bg-amber-400"
              />
              <PipelineStat 
                title="Approved" 
                count={metrics.approved.length} 
                total={metrics.totalApplicants}
                icon={<CheckCircle className="w-4 h-4" />}
                colorClass="text-emerald-600 bg-emerald-50"
                barColorClass="bg-emerald-400"
              />
            </div>
          </div>
          
        </div>

        {/* Right Column: Recent Activity */}
        <div className="h-full">
          <div className="bg-white rounded-lg p-6 h-full border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" /> Recent Activity
              </h3>
              <button 
                onClick={() => onNavigate('management')}
                className="text-xs font-semibold text-univ-indigo hover:text-indigo-700 transition-colors"
              >
                View All
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {metrics.recentSubmissions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {metrics.recentSubmissions.map(student => (
                    <div 
                      key={student.id} 
                      className="flex items-center justify-between gap-4 py-3 hover:bg-slate-50 cursor-pointer px-2 -mx-2 rounded-md transition-colors" 
                      onClick={() => onNavigate('verification')}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {student.firstName || 'Anonymous'} {student.lastName || 'Applicant'}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {PROGRAMS.find(p => p.id === student.programId)?.name || 'Undecided'}
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

function PipelineStat({ title, count, total, icon, colorClass, barColorClass }) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  
  return (
    <MiniStat 
      title={title}
      value={count}
      icon={icon}
      colorClass={colorClass}
    >
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100/60">
        <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full ${barColorClass} rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
        <span className="text-[10px] font-bold text-slate-400 w-6 text-right">{percentage}%</span>
      </div>
    </MiniStat>
  );
}

