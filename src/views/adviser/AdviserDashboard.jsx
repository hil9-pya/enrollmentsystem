import React, { useMemo } from 'react';
import { Users, FileCheck, Clock, FileWarning } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PROGRAMS } from '../../data/mockData';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e'];

export default function AdviserDashboard({ students, onNavigate }) {
  const metrics = useMemo(() => {
    // Only looking at students who are currently in the advising stage or have passed it
    const relevantStudents = students.filter(s => 
      ['advising_pending', 'advising_approved', 'advising_rejected', 'payment_pending', 'enrolled'].includes(s.status)
    );

    const totalStudents = relevantStudents.length;
    const pending = students.filter(s => s.status === 'advising_pending').length;
    const approved = students.filter(s => ['advising_approved', 'payment_pending', 'enrolled'].includes(s.status)).length;
    const rejected = students.filter(s => s.status === 'advising_rejected').length;

    // Group by status
    const statusData = [
      { name: 'Pending Eval', value: pending },
      { name: 'Approved', value: approved },
      { name: 'Returned', value: rejected },
    ].filter(d => d.value > 0);

    // Group pending by program
    const programData = PROGRAMS.map(prog => {
      const count = students.filter(s => s.programId === prog.id && s.status === 'advising_pending').length;
      return { name: prog.id.toUpperCase(), count };
    });

    return { totalStudents, pending, approved, rejected, statusData, programData };
  }, [students]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200 p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-univ-navy">Advising Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">Overview of curriculum evaluation and advising queue.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Assigned" 
          value={metrics.totalStudents} 
          icon={<Users className="w-5 h-5" />} 
          color="bg-indigo-50/70 text-univ-indigo border border-indigo-100" 
          onClick={() => {}} // No 'all' view yet
        />
        <MetricCard 
          title="Pending Evaluation" 
          value={metrics.pending} 
          icon={<Clock className="w-5 h-5" />} 
          color="bg-amber-50/70 text-univ-gold border border-amber-100" 
          onClick={() => onNavigate('pending')}
        />
        <MetricCard 
          title="Approved Schedules" 
          value={metrics.approved} 
          icon={<FileCheck className="w-5 h-5" />} 
          color="bg-emerald-50/70 text-emerald-600 border border-emerald-100" 
          onClick={() => onNavigate('approved')}
        />
        <MetricCard 
          title="Returned for Revision" 
          value={metrics.rejected} 
          icon={<FileWarning className="w-5 h-5" />} 
          color="bg-rose-50/70 text-rose-600 border border-rose-100" 
          onClick={() => onNavigate('rejected')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-premium">
          <h2 className="text-xs font-bold text-univ-navy mb-6 uppercase tracking-wider">Pending Evaluations by Program</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.programData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }} />
                <Bar 
                  dataKey="count" 
                  fill="#f59e0b" // gold/amber for pending
                  radius={[6, 6, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-premium flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-univ-navy mb-6 uppercase tracking-wider">Advising Status Distribution</h2>
            <div className="h-56 flex items-center justify-center">
              {metrics.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {metrics.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                 <p className="text-xs text-slate-400">No data available.</p>
              )}
            </div>
          </div>
          <div className="flex justify-center gap-5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-t border-slate-50 pt-4 flex-wrap">
            {metrics.statusData.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-premium flex flex-col justify-between min-h-[120px] cursor-pointer hover:shadow-premium-lg hover:border-univ-indigo/40 transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-2xl font-extrabold text-univ-navy mt-3 tracking-tight">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
