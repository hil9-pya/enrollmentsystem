import React, { useMemo, useState } from 'react';
import { DollarSign, Clock, CheckCircle, TrendingUp, Search, Download, Filter } from 'lucide-react';
import { PROGRAMS } from '../../data/mockData';
import StatusBadge from '../../components/StatusBadge';
import MiniStat from '../../components/MiniStat';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function formatPeso(amount) {
  if (amount == null) return '₱0';
  return '₱' + amount.toLocaleString('en-PH');
}

export default function AccountingDashboard({ students, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');

  const metrics = useMemo(() => {
    const relevantStudents = students.filter(s => 
      ['payment_pending', 'enrolled'].includes(s.status) || s.paymentStatus !== 'unpaid'
    );

    let expectedRevenue = 0;
    let collectedRevenue = 0;
    let pendingRevenue = 0;
    let paidCount = 0;

    relevantStudents.forEach(s => {
      expectedRevenue += (s.totalTuition || 0);
      if (s.paymentStatus === 'paid') {
        collectedRevenue += (s.totalTuition || 0);
        paidCount++;
      } else {
        pendingRevenue += (s.totalTuition || 0);
      }
    });

    const ledgerData = [...relevantStudents]
      .filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.firstName?.toLowerCase().includes(q) || s.lastName?.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
      })
      .sort((a, b) => b.id.localeCompare(a.id));

    // Chart Data Generation
    const monthlyRevenue = [
      { name: 'Jan', collected: 210000, expected: 250000 },
      { name: 'Feb', collected: 180000, expected: 200000 },
      { name: 'Mar', collected: 320000, expected: 350000 },
      { name: 'Apr', collected: Math.max(100000, Math.round(collectedRevenue * 0.4)), expected: Math.max(150000, Math.round(expectedRevenue * 0.4)) },
      { name: 'May', collected: collectedRevenue, expected: expectedRevenue },
    ];

    let programRevenue = PROGRAMS.map(p => ({
      name: p.id,
      value: students.filter(s => s.programId === p.id && s.paymentStatus === 'paid').reduce((acc, s) => acc + (s.totalTuition || 0), 0)
    })).filter(d => d.value > 0);
    
    if (programRevenue.length === 0) {
      programRevenue = [{ name: 'BSIT', value: 1 }]; // Fallback
    }

    return { expectedRevenue, collectedRevenue, pendingRevenue, paidCount, ledgerData, monthlyRevenue, programRevenue };
  }, [students, searchQuery]);

  const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 p-6 h-full overflow-y-auto bg-slate-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Analytics</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Overview of revenue streams, collection rates, and master ledger.</p>
        </div>
        <div className="flex gap-3">
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-md text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
             <Download className="w-4 h-4" /> Export Report
           </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MiniStat title="Total Expected" value={formatPeso(metrics.expectedRevenue)} icon={<TrendingUp className="w-4 h-4" />} colorClass="text-slate-600 bg-slate-100" onClick={() => onNavigate('ledger')} />
        <MiniStat title="Collected Revenue" value={formatPeso(metrics.collectedRevenue)} icon={<DollarSign className="w-4 h-4" />} colorClass="text-emerald-600 bg-emerald-50" onClick={() => onNavigate('paid')} />
        <MiniStat title="Pending Collections" value={formatPeso(metrics.pendingRevenue)} icon={<Clock className="w-4 h-4" />} colorClass="text-amber-600 bg-amber-50" onClick={() => onNavigate('pending')} />
        <MiniStat title="Fully Paid Students" value={metrics.paidCount} icon={<CheckCircle className="w-4 h-4" />} colorClass="text-univ-indigo bg-indigo-50" onClick={() => onNavigate('paid')} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col h-[300px]">
          <h3 className="text-sm font-bold text-slate-900 mb-6">Revenue Collection Trend</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.monthlyRevenue} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₱${val/1000}k`} dx={-10} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => formatPeso(value)}
                />
                <Bar dataKey="expected" name="Expected" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="collected" name="Collected" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col h-[300px]">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Revenue by Program</h3>
          <div className="flex-1 w-full min-h-0 relative">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.programRevenue}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {metrics.programRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatPeso(value)} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
              <span className="text-lg font-extrabold text-slate-900">{formatPeso(metrics.collectedRevenue)}</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {metrics.programRevenue.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Master Ledger Grid */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-sm font-bold text-slate-900">Master Ledger Directory</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search ledger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 pl-9 pr-3 text-xs font-medium focus:outline-none focus:border-univ-indigo focus:ring-1 focus:ring-univ-indigo transition-all"
              />
            </div>
            <button className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-2 text-xs font-bold">
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                <th className="px-5 py-3 font-semibold">Transaction ID</th>
                <th className="px-5 py-3 font-semibold">Student Name</th>
                <th className="px-5 py-3 font-semibold">Program</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold text-center">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.ledgerData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-medium">No ledger records found.</td>
                </tr>
              ) : (
                metrics.ledgerData.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-3">
                      <span className="font-mono text-slate-500 font-medium">TXN-{student.id.split('-')[1]}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{student.firstName} {student.lastName}</span>
                        <span className="text-[10px] font-mono font-medium text-slate-400">{student.id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-slate-600 font-medium">
                        {PROGRAMS.find(p => p.id === student.programId)?.name || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-bold ${student.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {formatPeso(student.totalTuition)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={student.paymentStatus === 'paid' ? 'enrolled' : 'payment_pending'} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => onNavigate(student.paymentStatus === 'paid' ? 'ledger' : 'verification')} 
                        className="inline-flex items-center justify-center px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-univ-indigo rounded transition-colors"
                      >
                        {student.paymentStatus === 'paid' ? 'View Receipt' : 'Verify Payment'}
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
  );
}


