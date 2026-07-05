import React, { useMemo } from 'react';
import { useEnrollment } from '../../context/EnrollmentContext';
import { PROGRAMS } from '../../data/mockData';
import { Users, FileCheck, DollarSign, Clock, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#f43f5e'];

export default function DashboardView() {
  const { state } = useEnrollment();
  const { students } = state;

  const metrics = useMemo(() => {
    const totalEnrolled = students.filter(s => s.status === 'enrolled').length;
    const pendingValidation = students.filter(s => s.status === 'validation_pending').length;
    const activeProcessing = students.filter(s => s.status !== 'registration' && s.status !== 'enrolled').length;
    
    const revenue = students
      .filter(s => s.paymentStatus === 'paid')
      .reduce((sum, s) => sum + (s.totalTuition || 0), 0);

    // Group by program for enrolled students
    const programData = PROGRAMS.map(prog => {
      const count = students.filter(s => s.programId === prog.id && s.status === 'enrolled').length;
      return { name: prog.id.toUpperCase(), count };
    });

    const statusData = [
      { name: 'Enrolled', value: totalEnrolled },
      { name: 'Processing', value: activeProcessing },
      { name: 'Pending Admin', value: pendingValidation }
    ];

    return { totalEnrolled, pendingValidation, activeProcessing, revenue, programData, statusData };
  }, [students]);

  const recentEnrollees = useMemo(() => {
    return students
      .filter(s => s.status === 'enrolled')
      .slice(-5);
  }, [students]);

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-univ-navy">System Analytics Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">Overview of the central enrollment pipeline metrics and tuition revenue ledger.</p>
        </div>
        <button className="flex items-center gap-2 px-4.5 py-2.5 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all cursor-pointer">
          Download System Report <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Total Enrolled" value={metrics.totalEnrolled} icon={<Users className="w-5 h-5" />} color="bg-indigo-50/70 text-univ-indigo border border-indigo-100" />
        <MetricCard title="Pending Validation" value={metrics.pendingValidation} icon={<FileCheck className="w-5 h-5" />} color="bg-amber-50/70 text-univ-gold border border-amber-100" />
        <MetricCard title="Active Processing" value={metrics.activeProcessing} icon={<Clock className="w-5 h-5" />} color="bg-blue-50/70 text-univ-blue border border-blue-100" />
        <MetricCard title="Total Revenue" value={`₱${metrics.revenue.toLocaleString()}`} icon={<DollarSign className="w-5 h-5" />} color="bg-emerald-50/70 text-emerald-600 border border-emerald-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-premium">
          <h2 className="text-xs font-bold text-univ-navy mb-6 uppercase tracking-wider">Enrollment by Course Program</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.programData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)' }} />
                <Bar dataKey="count" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-premium flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-univ-navy mb-6 uppercase tracking-wider">Pipeline Status</h2>
            <div className="h-56 flex items-center justify-center">
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
            </div>
          </div>
          <div className="flex justify-center gap-5 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-t border-slate-50 pt-4">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-univ-indigo"></div>Enrolled</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>Processing</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-univ-gold"></div>Pending</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-premium overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xs font-bold text-univ-navy uppercase tracking-wider">Recent Registrations Validated</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {recentEnrollees.length > 0 ? recentEnrollees.map((student) => (
            <div key={student.id} className="p-5 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-univ-blue/10 flex items-center justify-center text-univ-blue font-bold text-sm">
                  {student.firstName[0]}{student.lastName[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-univ-navy">{student.firstName} {student.lastName}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{student.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-univ-navy uppercase tracking-wider">{student.programId}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{student.enrollmentType}</p>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-xs text-slate-400 font-medium">No recent registrations have been validated.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-premium flex flex-col justify-between min-h-[120px]">
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
