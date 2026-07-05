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
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of enrollment pipeline and revenue.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
          Download Report <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Total Enrolled" value={metrics.totalEnrolled} icon={<Users />} color="bg-indigo-50 text-indigo-600" />
        <MetricCard title="Pending Validation" value={metrics.pendingValidation} icon={<FileCheck />} color="bg-amber-50 text-amber-600" />
        <MetricCard title="Active Processing" value={metrics.activeProcessing} icon={<Clock />} color="bg-blue-50 text-blue-600" />
        <MetricCard title="Total Revenue" value={`₱${metrics.revenue.toLocaleString()}`} icon={<DollarSign />} color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Enrollment by Program</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.programData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-6 uppercase tracking-wider">Pipeline Status</h2>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {metrics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs font-medium text-slate-600 mt-4">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-600"></div>Enrolled</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>Processing</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Pending</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Enrollments</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {recentEnrollees.length > 0 ? recentEnrollees.map((student) => (
            <div key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                  {student.firstName[0]}{student.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{student.firstName} {student.lastName}</p>
                  <p className="text-xs text-slate-500">{student.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900 uppercase">{student.programId}</p>
                <p className="text-xs text-slate-500">{student.enrollmentType}</p>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-sm text-slate-500">No recent enrollments.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
